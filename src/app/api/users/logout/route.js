import { getMongoDb } from '@/lib/mongoClient';

export async function POST(request) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing sessionId' }), { status: 400 });
    }
    const db = await getMongoDb();
    const sessions = db.collection('sessions');
    const result = await sessions.updateOne(
      { sessionId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );
    if (result.modifiedCount === 1) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: false, error: 'Session not found' }), { status: 404 });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: 'Logout failed' }), { status: 500 });
  }
} 