require('dotenv').config({ path: '.env' });
const { MongoClient, ObjectId } = require('mongodb');

async function fixUserRole() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Find user by email
    const user = await usersCollection.findOne({ 
      email: 'minhaj@wydexmedia.com' 
    });
    
    if (!user) {
      console.log('❌ User not found with email: minhaj@wydexmedia.com');
      return;
    }
    
    console.log('\n📋 Current User Details:');
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('  Current Role:', user.role);
    console.log('  User ID:', user._id);
    console.log('  Tenant ID:', user.tenantId);
    
    if (user.role === 'teamleader') {
      console.log('\n✅ User already has teamleader role!');
      console.log('💡 The issue is with your JWT token - you need to LOG OUT and LOG IN again.');
      return;
    }
    
    console.log('\n⚠️  User role is:', user.role);
    console.log('🔄 Updating role to: teamleader');
    
    // Update the role
    const result = await usersCollection.updateOne(
      { _id: user._id },
      { $set: { role: 'teamleader' } }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Role updated successfully!');
      console.log('\n⚠️  IMPORTANT: You MUST log out and log in again for the changes to take effect!');
    } else {
      console.log('❌ Failed to update role');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

fixUserRole();




