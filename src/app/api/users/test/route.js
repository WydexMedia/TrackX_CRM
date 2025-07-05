import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

export async function GET(request) {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db();
    const users = db.collection('users');
    
    // Get all users with passwords for testing
    const allUsers = await users.find({}).toArray();
    
    return NextResponse.json({
      success: true,
      users: allUsers.map(user => ({
        _id: user._id,
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
  } finally {
    await client.close();
  }
} 