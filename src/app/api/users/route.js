import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { users, tenants } from '@/db/schema';
import { eq, and, or, ne } from 'drizzle-orm';
import { getTenantContextFromRequest } from '@/lib/mongoTenant';
import { authenticateToken, createUnauthorizedResponse } from '@/lib/authMiddleware';
import { requireTenantIdFromRequest } from '@/lib/tenant';

// Get all users (for team leader)
export async function GET(request) {
  const authResult = await authenticateToken(request);
  if (!authResult.success) {
    return createUnauthorizedResponse(authResult.error, authResult.errorCode, authResult.statusCode);
  }

  const { tenantSubdomain, tenantId } = await getTenantContextFromRequest(request);
  
  let allUsers;
  if (tenantId) {
    allUsers = await db
      .select()
      .from(users)
      .where(eq(users.tenantId, tenantId));
  } else {
    allUsers = await db.select().from(users);
  }
  
  // Remove passwords from response
  const usersWithoutPasswords = allUsers.map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
  
  return NextResponse.json(usersWithoutPasswords);
}

// Create new user (for team leader)
export async function POST(request) {
  const authResult = await authenticateToken(request);
  if (!authResult.success) {
    return createUnauthorizedResponse(authResult.error, authResult.errorCode, authResult.statusCode);
  }

  const data = await request.json();
  const { tenantSubdomain, tenantId } = await getTenantContextFromRequest(request);
  
  console.log('Creating user with data:', data);
  
  // Force code to equal email for new users
  if (typeof data.email === 'string' && data.email.trim().length > 0) {
    data.code = data.email;
  }

  // Check if user with same code or email already exists
  if (tenantId) {
    const existingUsers = await db
      .select()
      .from(users)
      .where(and(
        eq(users.tenantId, tenantId),
        or(
          eq(users.code, data.code || ''),
          eq(users.email, data.email || '')
        )
      ))
      .limit(1);
    
    if (existingUsers.length > 0) {
      return NextResponse.json({ success: false, error: 'User with this email already exists' }, { status: 400 });
    }
  } else {
    // Check by email (globally unique)
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email || ''))
      .limit(1);
    
    if (existingUsers.length > 0) {
      return NextResponse.json({ success: false, error: 'User with this email already exists' }, { status: 400 });
    }
  }
  
  const userData = {
    email: data.email,
    password: data.password || '',
    code: data.code || data.email,
    name: data.name,
    role: data.role || 'sales',
    target: data.target || 0,
    tenantId: tenantId || null,
  };
  
  console.log('Final user data to insert:', userData);
  
  const [newUser] = await db
    .insert(users)
    .values(userData)
    .returning({ id: users.id });
  
  console.log('User created with ID:', newUser.id);
  
  return NextResponse.json({ success: true });
}

// Update user (for team leader)
export async function PUT(request) {
  const authResult = await authenticateToken(request);
  if (!authResult.success) {
    return createUnauthorizedResponse(authResult.error, authResult.errorCode, authResult.statusCode);
  }

  const { id, ...updateData } = await request.json();
  const { tenantId } = await getTenantContextFromRequest(request);
  
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing user ID' }, { status: 400 });
  }
  
  // Remove fields that shouldn't be updated
  delete updateData.id;
  const updatePayload = {
    ...updateData,
    updatedAt: new Date()
  };
  
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ success: false, error: 'Invalid user ID' }, { status: 400 });
  }
  
  let updateResult;
  if (tenantId) {
    updateResult = await db
      .update(users)
      .set(updatePayload)
      .where(and(
        eq(users.id, userId),
        eq(users.tenantId, tenantId)
      ))
      .returning({ id: users.id });
  } else {
    updateResult = await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, userId))
      .returning({ id: users.id });
  }
  
  if (updateResult.length > 0) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ success: false, error: 'User not found or not updated' }, { status: 404 });
  }
}

// Delete user (for team leader)
export async function DELETE(request) {
  const authResult = await authenticateToken(request);
  if (!authResult.success) {
    return createUnauthorizedResponse(authResult.error, authResult.errorCode, authResult.statusCode);
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const { tenantId } = await getTenantContextFromRequest(request);
  
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing user ID' }, { status: 400 });
  }
  
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ success: false, error: 'Invalid user ID' }, { status: 400 });
  }
  
  let deleteResult;
  if (tenantId) {
    deleteResult = await db
      .delete(users)
      .where(and(
        eq(users.id, userId),
        eq(users.tenantId, tenantId)
      ))
      .returning({ id: users.id });
  } else {
    deleteResult = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning({ id: users.id });
  }
  
  if (deleteResult.length > 0) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }
}
