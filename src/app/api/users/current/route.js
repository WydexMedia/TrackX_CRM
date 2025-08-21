import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { getTenantContextFromRequest } from '@/lib/mongoTenant';

const uri = process.env.MONGODB_URI;

export async function GET(request) {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db();
    const users = db.collection('users');
    
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const { tenantSubdomain } = await getTenantContextFromRequest(request);
    
    if (!code) {
      return NextResponse.json({ 
        success: false, 
        error: "User code is required" 
      }, { status: 400 });
    }
    
    const user = await users.findOne(tenantSubdomain ? { code: code, tenantSubdomain } : { code: code });
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: "User not found" 
      }, { status: 404 });
    }
    
    // Return user data without password
    const { password, ...userWithoutPassword } = user;
    
    return NextResponse.json({ 
      success: true, 
      user: userWithoutPassword
    });
    
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to fetch user" 
    }, { status: 500 });
  } finally {
    await client.close();
  }
} 