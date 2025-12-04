import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTenantContextFromRequest } from '@/lib/mongoTenant';

export async function POST(request) {
  try {
    const { id, currentPassword, newPassword } = await request.json();
    const { tenantId } = await getTenantContextFromRequest(request);
    
    if (!id || !currentPassword || !newPassword) {
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
    
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid user ID' 
      }, { status: 400 });
    }
    
    // Find user and verify current password
    let userResult;
    if (tenantId) {
      userResult = await db
        .select()
        .from(users)
        .where(and(
          eq(users.id, userId),
          eq(users.tenantId, tenantId)
        ))
        .limit(1);
    } else {
      userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
    }
    
    const user = userResult[0];
    
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
    const updateResult = await db
      .update(users)
      .set({ 
        password: newPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning({ id: users.id });
    
    if (updateResult.length > 0) {
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
