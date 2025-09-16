import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { getTenantContextFromRequest } from '@/lib/mongoTenant';
import { authenticateToken, createUnauthorizedResponse } from '@/lib/authMiddleware';

const uri = process.env.MONGODB_URI;

export async function GET(request) {
  // Authenticate the request
  const authResult = await authenticateToken(request);
  if (!authResult.success) {
    return createUnauthorizedResponse(authResult.error, authResult.errorCode, authResult.statusCode);
  }

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db();
    const users = db.collection('users');
    
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const identifier = searchParams.get('identifier') || code;
    const { tenantSubdomain } = await getTenantContextFromRequest(request);
    
    if (!identifier) {
      return NextResponse.json({ 
        success: false, 
        error: "User identifier is required" 
      }, { status: 400 });
    }
    
    let user = null;
    if (tenantSubdomain) {
      if (/@/.test(identifier)) {
        user = await users.findOne({ email: identifier, tenantSubdomain });
      }
      if (!user) {
        user = await users.findOne({ code: identifier, tenantSubdomain });
      }
    } else {
      if (/@/.test(identifier)) {
        user = await users.findOne({ email: identifier });
      }
      if (!user) {
        user = await users.findOne({ code: identifier });
      }
    }
    
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