import { getTenantContextFromRequest } from '@/lib/mongoTenant';
import { db } from '@/db/client';
import { users, tenants } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateToken, revokeAllUserTokens } from '@/lib/jwt';

export async function POST(request) {
  console.log('LOGIN CONFIRM API HIT');
  const body = await request.json();
  const { email, password } = body;
  const { tenantSubdomain, tenantId } = await getTenantContextFromRequest(request);
  console.log('Received:', { email, tenantSubdomain });

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
    const userResult = await db
      .select()
      .from(users)
      .where(and(
        eq(users.email, email),
        eq(users.password, password)
      ))
      .limit(1);
    user = userResult[0];
  }
  
  console.log('User found:', user ? { id: user.id, email: user.email } : null);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
  }

  // Get user's tenant subdomain
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

  // Force revoke all existing tokens (user confirmed they want to proceed)
  await revokeAllUserTokens(user.id.toString());

  // Update last login timestamp
  await db
    .update(users)
    .set({ lastLogin: new Date() })
    .where(eq(users.id, user.id));

  // Generate new JWT token
  const token = generateToken({
    userId: user.id.toString(),
    email: user.email,
    role: user.role || 'sales',
    tenantSubdomain: tenantSubdomain || userTenantSubdomain
  });

  // If logging in from main domain and user has a tenant, we need to redirect them
  const needsRedirect = !tenantSubdomain && userTenantSubdomain;

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
    updatedAt: user.updatedAt
  };

  // If user needs redirect to their tenant subdomain, include that info
  if (needsRedirect) {
    const baseDomain = process.env.NODE_ENV === 'development' 
      ? 'localhost:3000' 
      : 'wydex.co';
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    
    let dashboardPath = '/dashboard';
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

  return new Response(JSON.stringify({ ...userData, token }), { status: 200 });
}
