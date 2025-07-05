import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

export async function POST() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db();
    const users = db.collection('users');
    
    // Check if team leader already exists
    const existingTeamLeader = await users.findOne({ code: "MuhsinaWydex" });
    if (existingTeamLeader) {
      return NextResponse.json({ 
        success: false, 
        message: "Team leader already exists" 
      });
    }
    
    // Create team leader user
    const teamLeader = {
      name: "Muhsina Wydex",
      code: "MuhsinaWydex",
      email: "muhsina@wydex.com",
      password: "Muhsinaproskill@2025",
      role: "teamleader",
      target: 0,
      createdAt: new Date()
    };
    
    await users.insertOne(teamLeader);
    
    return NextResponse.json({ 
      success: true, 
      message: "Team leader created successfully",
      user: {
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
  } finally {
    await client.close();
  }
} 