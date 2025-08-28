import { getTenantContextFromRequest } from '@/lib/mongoTenant';
import { getMongoDb } from '@/lib/mongoClient';
import crypto from 'crypto';

export async function POST(request) {
  console.log('LOGIN API HIT');
  const { code, password } = await request.json();
  const { tenantSubdomain } = await getTenantContextFromRequest(request);
  console.log('Received:', { code, password });

  const db = await getMongoDb();

  // Validate credentials
  const criteria = tenantSubdomain ? { code, password, tenantSubdomain } : { code, password };
  const user = await db.collection('users').findOne(criteria);
  console.log('User found:', user);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
  }

  // Enforce single active session
  const sessions = db.collection('sessions');
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
    tenantSubdomain: tenantSubdomain || '',
    createdAt: new Date(),
    lastSeenAt: new Date(),
  });

  // Do not send password back
  const { password: _, ...userData } = user;
  if (!userData.role) {
    userData.role = 'sales';
  }

  // Include sessionId so client can manage logout
  return new Response(JSON.stringify({ ...userData, sessionId }), { status: 200 });
}
