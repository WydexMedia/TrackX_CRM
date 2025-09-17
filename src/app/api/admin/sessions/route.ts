import { getMongoDb } from '@/lib/mongoClient';
import { NextRequest } from 'next/server';
import { verifyToken, revokeAllUserTokens } from '@/lib/jwt';

// GET - Fetch all active tokens (non-blacklisted)
export async function GET() {
  try {
    const db = await getMongoDb();
    const users = db.collection('users');
    
    // Get all users to show their token status
    const allUsers = await users.find({}).toArray();
    
    // For JWT system, we'll show all users since we can't track active tokens without storing them
    // In a production system, you might want to store active tokens in a separate collection
    const usersWithTokenInfo = allUsers.map((user: any) => ({
      userId: user._id.toString(),
      userName: user.name || 'Unknown',
      userCode: user.code || 'Unknown',
      userEmail: user.email || 'Unknown',
      userRole: user.role || 'sales',
      tenantSubdomain: user.tenantSubdomain || 'Main',
      // Note: JWT tokens don't have creation timestamps unless we store them separately
      lastLogin: user.lastLogin || 'Unknown',
      status: 'Active' // We can't easily track this with stateless JWT
    }));
    
    return new Response(JSON.stringify({ 
      success: true, 
      sessions: usersWithTokenInfo,
      total: usersWithTokenInfo.length,
      note: 'JWT system - showing all users. Tokens are stateless and expire automatically.'
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to fetch users' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE - Revoke all tokens for a user or all users
export async function DELETE(request: NextRequest) {
  try {
    const { userId, killAll } = await request.json();
    
    if (killAll) {
      // Revoke all tokens for all users
      const db = await getMongoDb();
      const users = db.collection('users');
      const allUsers = await users.find({}).toArray();
      
      let totalRevoked = 0;
      for (const user of allUsers) {
        try {
          await revokeAllUserTokens(user._id.toString());
          totalRevoked++;
        } catch (error) {
          console.error(`Failed to revoke tokens for user ${user._id}:`, error);
        }
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Revoked tokens for ${totalRevoked} users`,
        revokedCount: totalRevoked
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (userId) {
      // Revoke all tokens for specific user
      try {
        await revokeAllUserTokens(userId);
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'All tokens for user revoked successfully' 
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error revoking user tokens:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Failed to revoke user tokens' 
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing userId or killAll parameter' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error revoking tokens:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to revoke tokens' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 