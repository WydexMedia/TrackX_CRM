import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { getTenantContextFromRequest } from '@/lib/mongoTenant';

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (!clientPromise) {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

// Get all users (for team leader)
export async function GET(request) {
  const { tenantSubdomain } = await getTenantContextFromRequest(request);
  const client = await clientPromise;
  const db = client.db();
  const users = db.collection('users');
  const filter = tenantSubdomain ? { tenantSubdomain } : {};
  const allUsers = await users.find(filter).toArray();
  
  console.log('All users from DB (including passwords):', allUsers); // Debug log
  
  // Remove passwords from response
  const usersWithoutPasswords = allUsers.map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
  return NextResponse.json(usersWithoutPasswords);
}

// Create new user (for team leader)
export async function POST(request) {
  const client = await clientPromise;
  const db = client.db();
  const users = db.collection('users');
  const data = await request.json();
  const { tenantSubdomain } = await getTenantContextFromRequest(request);
  
  console.log('Creating user with data:', data); // Debug log
  
  // Check if user with same code already exists
  const existingUser = await users.findOne(tenantSubdomain ? { code: data.code, tenantSubdomain } : { code: data.code });
  if (existingUser) {
    return NextResponse.json({ success: false, error: 'User with this code already exists' }, { status: 400 });
  }
  
  data.createdAt = new Date();
  data.role = data.role || 'sales'; // Default role is sales
  data.target = data.target || 0; // Default target is 0
  if (tenantSubdomain) data.tenantSubdomain = tenantSubdomain;
  
  console.log('Final user data to insert:', data); // Debug log
  
  const result = await users.insertOne(data);
  console.log('User created with ID:', result.insertedId); // Debug log
  
  return NextResponse.json({ success: true });
}

// Update user (for team leader)
export async function PUT(request) {
  const client = await clientPromise;
  const db = client.db();
  const users = db.collection('users');
  const { _id, ...updateData } = await request.json();
  const { tenantSubdomain } = await getTenantContextFromRequest(request);
  
  if (!_id) {
    return NextResponse.json({ success: false, error: 'Missing user ID' }, { status: 400 });
  }
  
  // Remove fields that shouldn't be updated
  delete updateData._id;
  updateData.updatedAt = new Date();
  
  const result = await users.updateOne(
    tenantSubdomain ? { _id: new ObjectId(_id), tenantSubdomain } : { _id: new ObjectId(_id) },
    { $set: updateData }
  );
  
  if (result.modifiedCount === 1) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ success: false, error: 'User not found or not updated' }, { status: 404 });
  }
}

// Delete user (for team leader)
export async function DELETE(request) {
  const client = await clientPromise;
  const db = client.db();
  const users = db.collection('users');
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const { tenantSubdomain } = await getTenantContextFromRequest(request);
  
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing user ID' }, { status: 400 });
  }
  
  const result = await users.deleteOne(tenantSubdomain ? { _id: new ObjectId(id), tenantSubdomain } : { _id: new ObjectId(id) });
  
  if (result.deletedCount === 1) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }
} 