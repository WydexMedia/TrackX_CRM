import { getMongoDb } from '@/lib/mongoClient';
import { NextRequest } from 'next/server';

// GET - Fetch all active sessions
export async function GET() {
  try {
    const db = await getMongoDb();
    const sessions = db.collection('sessions');
    const users = db.collection('users');
    
    // Get all active sessions
    const activeSessions = await sessions.find({ 
      revokedAt: { $exists: false } 
    }).sort({ createdAt: -1 }).toArray();
    
    // Get user details for each session
    const sessionsWithUserInfo = await Promise.all(
      activeSessions.map(async (session: any) => {
        try {
          const user = await users.findOne({ _id: session.userId });
          return {
            sessionId: session.sessionId,
            userId: session.userId.toString(),
            userName: user?.name || 'Unknown',
            userCode: user?.code || 'Unknown',
            userEmail: user?.email || 'Unknown',
            userRole: user?.role || 'Unknown',
            tenantSubdomain: session.tenantSubdomain || 'Main',
            createdAt: session.createdAt,
            lastSeenAt: session.lastSeenAt,
            duration: Math.round((new Date().getTime() - new Date(session.createdAt).getTime()) / 1000 / 60) // minutes
          };
        } catch (error) {
          return {
            sessionId: session.sessionId,
            userId: session.userId.toString(),
            userName: 'Error loading user',
            userCode: 'Error',
            userEmail: 'Error',
            userRole: 'Error',
            tenantSubdomain: session.tenantSubdomain || 'Main',
            createdAt: session.createdAt,
            lastSeenAt: session.lastSeenAt,
            duration: 0
          };
        }
      })
    );
    
    return new Response(JSON.stringify({ 
      success: true, 
      sessions: sessionsWithUserInfo,
      total: sessionsWithUserInfo.length
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to fetch sessions' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE - Kill a specific session or all sessions
export async function DELETE(request: NextRequest) {
  try {
    const { sessionId, killAll } = await request.json();
    
    const db = await getMongoDb();
    const sessions = db.collection('sessions');
    
    let result;
    
    if (killAll) {
      // Kill all active sessions
      result = await sessions.updateMany(
        { revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date() } }
      );
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Killed ${result.modifiedCount} active sessions`,
        killedCount: result.modifiedCount
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (sessionId) {
      // Kill specific session
      result = await sessions.updateOne(
        { sessionId, revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date() } }
      );
      
      if (result.modifiedCount === 1) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Session killed successfully' 
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Session not found or already revoked' 
        }), { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing sessionId or killAll parameter' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error killing session:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to kill session' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 