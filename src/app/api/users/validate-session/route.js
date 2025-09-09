import { getMongoDb } from '@/lib/mongoClient';

export async function POST(request) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Session ID is required' }), { status: 400 });
    }

    const db = await getMongoDb();
    const sessions = db.collection('sessions');
    const users = db.collection('users');

    // Find the session
    const session = await sessions.findOne({ 
      sessionId, 
      revokedAt: { $exists: false } 
    });

    if (!session) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), { status: 401 });
    }

    // Find the user
    const user = await users.findOne({ _id: session.userId });
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    // Update last seen
    await sessions.updateOne(
      { sessionId },
      { $set: { lastSeenAt: new Date() } }
    );

    // Return user data without password
    const { password: _, ...userData } = user;
    if (!userData.role) {
      userData.role = 'sales';
    }

    return new Response(JSON.stringify({ 
      ...userData, 
      sessionId 
    }), { status: 200 });

  } catch (error) {
    console.error('Session validation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
