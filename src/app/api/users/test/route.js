import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { users } from '@/db/schema';

export async function GET(request) {
  try {
    // Get all users with passwords for testing
    const allUsers = await db
      .select()
      .from(users);
    
    return NextResponse.json({
      success: true,
      users: allUsers.map(user => ({
        id: user.id,
        name: user.name,
        code: user.code,
        email: user.email,
        role: user.role,
        hasPassword: !!user.password,
        passwordLength: user.password ? user.password.length : 0
      }))
    });
    
  } catch (error) {
    console.error('Error testing users:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to test users" 
    }, { status: 500 });
  }
}
