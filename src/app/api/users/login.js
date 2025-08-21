import { MongoClient } from 'mongodb';
import { getTenantContextFromRequest } from '@/lib/mongoTenant';

const uri = process.env.MONGODB_URI;

export async function POST(request) {
  console.log('LOGIN API HIT');
  const { code, password } = await request.json();
  const { tenantSubdomain } = await getTenantContextFromRequest(request);
  console.log('Received:', { code, password });
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const user = await db.collection('users').findOne(tenantSubdomain ? { code, password, tenantSubdomain } : { code, password });
  console.log('User found:', user);
  await client.close();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
  }
  // Do not send password back
  const { password: _, ...userData } = user;
  return new Response(JSON.stringify(userData), { status: 200 });
}
