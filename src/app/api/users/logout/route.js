import { getMongoDb } from '@/lib/mongoClient';
import { blacklistToken, extractTokenFromHeader } from '@/lib/jwt';
import { ObjectId } from 'mongodb';

export async function POST(request) {
  try {
    // Extract token from Authorization header or request body
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = extractTokenFromHeader(authHeader);
    const { token: tokenFromBody } = await request.json();
    
    const token = tokenFromHeader || tokenFromBody;
    
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'Missing token' }), { status: 400 });
    }

    // Get user ID from token for blacklisting
    const { verifyToken } = await import('@/lib/jwt');
    const payload = verifyToken(token);
    
    if (!payload) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), { status: 401 });
    }

    // Blacklist the token
    await blacklistToken(token, payload.userId);
    
    // Set lastLogout timestamp to indicate clean logout
    const db = await getMongoDb();
    const usersCollection = db.collection('users');
    const updateResult = await usersCollection.updateOne(
      { _id: new ObjectId(payload.userId) },
      { $set: { lastLogout: new Date() } }
    );
    
    console.log('Logout update result:', {
      userId: payload.userId,
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount
    });
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    console.error('Logout error:', e);
    return new Response(JSON.stringify({ success: false, error: 'Logout failed' }), { status: 500 });
  }
} 