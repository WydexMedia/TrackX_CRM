import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (!clientPromise) {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

// Get all users with passwords (for team leader credentials view)
export async function GET() {
  const client = await clientPromise;
  const db = client.db();
  const users = db.collection('users');
  
  // Get all users including passwords, but exclude team leaders
  const allUsers = await users.find({ role: { $ne: 'teamleader' } }).toArray();
  
  console.log('Users with passwords for credentials view:', allUsers.length);
  
  // Return users with passwords included
  return NextResponse.json(allUsers);
} 