import { getTenantContextFromRequest } from '@/lib/mongoTenant';
import { getMongoDb } from '@/lib/mongoClient';
import { generateToken, revokeAllUserTokens } from '@/lib/jwt';

export async function POST(request) {
  console.log('LOGIN CONFIRM API HIT');
  const body = await request.json();
  const { email, password } = body;
  const { tenantSubdomain } = await getTenantContextFromRequest(request);
  console.log('Received:', { email, tenantSubdomain });

  const db = await getMongoDb();

  // Validate credentials
  let user;
  const usersCol = db.collection('users');
  
  if (!password || typeof password !== 'string') {
    return new Response(
      JSON.stringify({ error: 'Password is required for login' }),
      { status: 400 }
    );
  }

  if (tenantSubdomain) {
    user = await usersCol.findOne({ email, password, tenantSubdomain });
  } else {
    // Global unique email → no tenant filter needed
    user = await usersCol.findOne({ email, password });
  }
  
  console.log('User found:', user);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
  }

  // Force revoke all existing tokens (user confirmed they want to proceed)
  await revokeAllUserTokens(user._id.toString());

  // Update last login timestamp
  await usersCol.updateOne(
    { _id: user._id },
    { $set: { lastLogin: new Date() } }
  );

  // Generate new JWT token
  const token = generateToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role || 'sales',
    tenantSubdomain: tenantSubdomain || user.tenantSubdomain || ''
  });

  // If logging in from main domain and user has a tenant, we need to redirect them
  const needsRedirect = !tenantSubdomain && user.tenantSubdomain;

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
      token,
      needsRedirect: true,
      redirectTo: `${protocol}://${user.tenantSubdomain}.${baseDomain}${dashboardPath}?token=${token}`
    }), { status: 200 });
  }

  // Include token so client can manage authentication
  return new Response(JSON.stringify({ ...userData, token }), { status: 200 });
}
