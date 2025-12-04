import { getTenantContextFromRequest } from '@/lib/mongoTenant';
import { db } from '@/db/client';
import { users, tenants } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateToken, revokeAllUserTokens } from '@/lib/jwt';

export async function POST(request) {
  try {
    console.log('LOGIN API HIT');
    const body = await request.json();
    const { email, password } = body;
    const { tenantSubdomain: initialTenantSubdomain, tenantId } = await getTenantContextFromRequest(request);
    let tenantSubdomain = initialTenantSubdomain; // Use let so we can reassign later if needed
    console.log('Received:', { email, tenantSubdomain });

    // Validate credentials
    // Enforce email-based login only
    if (!email || typeof email !== 'string' || !/@/.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Email is required for login' }),
        { status: 400 }
      );
    }
    if (!password || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Password is required for login' }),
        { status: 400 }
      );
    }

    // Find user in PostgreSQL
    let user;
    if (tenantId) {
      const userResult = await db
        .select()
        .from(users)
        .where(and(
          eq(users.email, email),
          eq(users.password, password),
          eq(users.tenantId, tenantId)
        ))
        .limit(1);
      user = userResult[0];
    } else {
      // Global unique email → no tenant filter needed
      const userResult = await db
        .select()
        .from(users)
        .where(and(
          eq(users.email, email),
          eq(users.password, password)
        ))
        .limit(1);
      user = userResult[0];
      
      // If user found, get their tenant subdomain if they have one
      if (user && user.tenantId) {
        const tenantResult = await db
          .select({ subdomain: tenants.subdomain })
          .from(tenants)
          .where(eq(tenants.id, user.tenantId))
          .limit(1);
        if (tenantResult[0]) {
          tenantSubdomain = tenantResult[0].subdomain;
        }
      }
    }
    
    console.log('User found:', user ? { id: user.id, email: user.email } : null);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
    }

    // Get user's tenant subdomain if they have one
    let userTenantSubdomain = '';
    if (user.tenantId) {
      const tenantResult = await db
        .select({ subdomain: tenants.subdomain })
        .from(tenants)
        .where(eq(tenants.id, user.tenantId))
        .limit(1);
      if (tenantResult[0]) {
        userTenantSubdomain = tenantResult[0].subdomain;
      }
    }

    // If logging in from main domain and user has a tenant, we need to redirect them
    const needsRedirect = !tenantSubdomain && userTenantSubdomain;

    // Check if user has any recent login (within last 2 hours) - this indicates an active session
    // But only if there wasn't a clean logout after that login
    const hasRecentSession = user.lastLogin && 
      (new Date() - new Date(user.lastLogin)) < (2 * 60 * 60 * 1000) && // 2 hours
      (!user.lastLogout || new Date(user.lastLogin) > new Date(user.lastLogout)); // login was after last logout
    
    console.log('Session check:', {
      userId: user.id,
      lastLogin: user.lastLogin,
      lastLogout: user.lastLogout,
      hasRecentSession,
      timeDiff: user.lastLogin ? (new Date() - new Date(user.lastLogin)) : 'no lastLogin',
      loginAfterLogout: user.lastLogin && user.lastLogout ? 
        (new Date(user.lastLogin) > new Date(user.lastLogout)) : 'no logout'
    });
    
    if (hasRecentSession) {
      // Don't automatically revoke, instead return a confirmation request
      console.log('Active session detected, returning 409');
      return new Response(
        JSON.stringify({ 
          error: 'User already has an active session', 
          code: 'ACTIVE_SESSION_CONFIRMATION_REQUIRED',
          message: 'You\'re already logged in on another device. To continue here, please log out from the other session.'
        }),
        { status: 409 }
      );
    }
    
    // Update last login timestamp
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    // Revoke all existing tokens for this user to enforce single active session
    await revokeAllUserTokens(user.id.toString());

    // Generate new JWT token
    const token = generateToken({
      userId: user.id.toString(),
      email: user.email,
      role: user.role || 'sales',
      tenantSubdomain: tenantSubdomain || userTenantSubdomain
    });

    // Prepare user data without password
    const userData = {
      id: user.id,
      email: user.email,
      code: user.code,
      name: user.name,
      role: user.role || 'sales',
      target: user.target,
      tenantId: user.tenantId,
      tenantSubdomain: userTenantSubdomain,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin,
      lastLogout: user.lastLogout
    };

    // If user needs redirect to their tenant subdomain, include that info
    if (needsRedirect) {
      // Determine the base domain based on environment
      const baseDomain = process.env.NODE_ENV === 'development' 
        ? 'localhost:3000' 
        : 'wydex.co';
      const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
      
      // Determine the dashboard path based on user role
      let dashboardPath = '/dashboard'; // default for sales users
      if (userData.role === 'CEO') {
        dashboardPath = '/ceo';
      } else if (userData.role === 'teamleader') {
        dashboardPath = '/team-leader';
      } else if (userData.role === 'jl') {
        dashboardPath = '/junior-leader';
      }
      
      return new Response(JSON.stringify({ 
        ...userData, 
        token,
        needsRedirect: true,
        redirectTo: `${protocol}://${userTenantSubdomain}.${baseDomain}${dashboardPath}?token=${token}`
      }), { status: 200 });
    }

    // Include token so client can manage authentication
    return new Response(JSON.stringify({ ...userData, token }), { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Login failed',
        message: error?.message || 'An unexpected error occurred'
      }),
      { status: 500 }
    );
  }
}
