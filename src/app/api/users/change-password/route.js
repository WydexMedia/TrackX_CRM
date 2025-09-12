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

export async function POST(request) {
  try {
    const { _id, currentPassword, newPassword } = await request.json();
    const { tenantSubdomain } = await getTenantContextFromRequest(request);
    
    if (!_id || !currentPassword || !newPassword) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }
    
    if (newPassword.length < 6) {
      return NextResponse.json({ 
        success: false, 
        error: 'New password must be at least 6 characters long' 
      }, { status: 400 });
    }
    
    const client = await clientPromise;
    const db = client.db();
    const users = db.collection('users');
    
    // Find user and verify current password
    const filter = tenantSubdomain 
      ? { _id: new ObjectId(_id), tenantSubdomain } 
      : { _id: new ObjectId(_id) };
    
    const user = await users.findOne(filter);
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    // Verify current password
    if (user.password !== currentPassword) {
      return NextResponse.json({ 
        success: false, 
        error: 'Current password is incorrect' 
      }, { status: 401 });
    }
    
    // Update password
    const result = await users.updateOne(
      filter,
      { 
        $set: { 
          password: newPassword,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.modifiedCount === 1) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update password' 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 