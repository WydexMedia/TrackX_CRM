import { getTenantContextFromRequest } from '@/lib/mongoTenant';
import { getMongoDb } from '@/lib/mongoClient';
import crypto from 'crypto';

export async function POST(request) {
  console.log('LOGIN API HIT');
  const body = await request.json();
  const { email, password } = body;
  const identifier = body.identifier || email || body.code;
  const { tenantSubdomain } = await getTenantContextFromRequest(request);
  console.log('Received:', { identifier, tenantSubdomain });

  const db = await getMongoDb();

  // Validate credentials
  let user;
  const usersCol = db.collection('users');
  if (tenantSubdomain) {
    // Prefer email match if identifier looks like email; otherwise fall back to code
    if (identifier && /@/.test(identifier)) {
      user = await usersCol.findOne({ email: identifier, password, tenantSubdomain });
    }
    if (!user && identifier) {
      user = await usersCol.findOne({ code: identifier, password, tenantSubdomain });
    }
  } else {
    if (identifier && /@/.test(identifier)) {
      user = await usersCol.findOne({ email: identifier, password });
    }
    if (!user && identifier) {
      user = await usersCol.findOne({ code: identifier, password });
    }
  }
  
  console.log('User found:', user);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
  }

  // If logging in from main domain and user has a tenant, we need to redirect them
  const needsRedirect = !tenantSubdomain && user.tenantSubdomain;

  // Enforce single active session
  const sessions = db.collection('sessions');
  const userTenantSubdomain = user.tenantSubdomain || '';
  const activeFilter = tenantSubdomain
    ? { userId: user._id, tenantSubdomain, revokedAt: { $exists: false } }
    : { userId: user._id, revokedAt: { $exists: false } };
  const active = await sessions.findOne(activeFilter);
  if (active) {
    return new Response(
      JSON.stringify({ error: 'User already has an active session', code: 'ACTIVE_SESSION' }),
      { status: 409 }
    );
  }

  const sessionId = crypto.randomUUID();
  await sessions.insertOne({
    sessionId,
    userId: user._id,
    tenantSubdomain: tenantSubdomain || userTenantSubdomain,
    createdAt: new Date(),
    lastSeenAt: new Date(),
  });

  // Do not send password back
  const { password: _, ...userData } = user;
  if (!userData.role) {
    userData.role = 'sales';
  }

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
      sessionId,
      needsRedirect: true,
      redirectTo: `${protocol}://${userTenantSubdomain}.${baseDomain}${dashboardPath}?sessionId=${sessionId}`
    }), { status: 200 });
  }

  // Include sessionId so client can manage logout
  return new Response(JSON.stringify({ ...userData, sessionId }), { status: 200 });
}
