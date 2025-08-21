import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { getTenantContextFromRequest } from '@/lib/mongoTenant';

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (!clientPromise) {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

// Get all users with passwords (for team leader credentials view)
export async function GET(request) {
  const { tenantSubdomain } = await getTenantContextFromRequest(request);
  const client = await clientPromise;
  const db = client.db();
  const users = db.collection('users');
  const query = Object.assign({ role: { $ne: 'teamleader' } }, tenantSubdomain ? { tenantSubdomain } : {});
  const allUsers = await users.find(query).toArray();
  
  console.log('Users with passwords for credentials view:', allUsers.length);
  
  // Return users with passwords included
  return NextResponse.json(allUsers);
} 