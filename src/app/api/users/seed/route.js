import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  try {
    // Check if team leader already exists by code
    const existingTeamLeader = await db
      .select()
      .from(users)
      .where(eq(users.code, "MuhsinaWydex"))
      .limit(1);
    
    if (existingTeamLeader.length > 0) {
      return NextResponse.json({ 
        success: false, 
        message: "Team leader already exists" 
      });
    }
    
    // Create team leader user
    const [teamLeader] = await db
      .insert(users)
      .values({
        name: "Muhsina Wydex",
        code: "MuhsinaWydex",
        email: "muhsina@wydex.com",
        password: "Muhsinaproskill@2025",
        role: "teamleader",
        target: 0,
      })
      .returning({ 
        id: users.id,
        name: users.name,
        code: users.code,
        email: users.email,
        role: users.role
      });
    
    return NextResponse.json({ 
      success: true, 
      message: "Team leader created successfully",
      user: {
        id: teamLeader.id,
        name: teamLeader.name,
        code: teamLeader.code,
        email: teamLeader.email,
        role: teamLeader.role
      }
    });
    
  } catch (error) {
    console.error('Error creating team leader:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to create team leader" 
    }, { status: 500 });
  }
}
