/*
  Script to inspect MongoDB collections and generate a detailed report
  Usage: MONGODB_URI="mongodb+srv://..." node scripts/inspect-mongodb.js
*/

const { MongoClient } = require("mongodb");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    
    console.log("🔍 Inspecting MongoDB Collections...\n");
    
    // Get all collection names
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log(`📊 Found ${collectionNames.length} collections:\n`);
    
    const report = {
      database: db.databaseName,
      totalCollections: collectionNames.length,
      collections: []
    };
    
    for (const collectionName of collectionNames) {
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();
      
      // Get a sample document to understand structure
      const sample = await collection.findOne({});
      
      // Get indexes
      const indexes = await collection.indexes();
      
      // Analyze fields in sample documents
      const fieldAnalysis = {};
      if (sample) {
        const analyzeObject = (obj, prefix = '') => {
          for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (value === null) {
              fieldAnalysis[fullKey] = { type: 'null', examples: ['null'] };
            } else if (Array.isArray(value)) {
              fieldAnalysis[fullKey] = { 
                type: 'array', 
                itemType: value.length > 0 ? typeof value[0] : 'unknown',
                examples: value.slice(0, 3)
              };
            } else if (value instanceof Date) {
              fieldAnalysis[fullKey] = { type: 'Date', examples: [value.toISOString()] };
            } else if (typeof value === 'object') {
              fieldAnalysis[fullKey] = { type: 'object', examples: ['nested object'] };
              analyzeObject(value, fullKey);
            } else {
              fieldAnalysis[fullKey] = { 
                type: typeof value, 
                examples: value !== undefined && value !== null ? [String(value).substring(0, 50)] : ['undefined']
              };
            }
          }
        };
        analyzeObject(sample);
      }
      
      const collectionInfo = {
        name: collectionName,
        documentCount: count,
        indexes: indexes.map(idx => ({
          name: idx.name,
          keys: idx.key,
          unique: idx.unique || false,
          sparse: idx.sparse || false
        })),
        fields: fieldAnalysis,
        sampleDocument: sample ? JSON.stringify(sample, null, 2).substring(0, 1000) : null
      };
      
      report.collections.push(collectionInfo);
      
      console.log(`📁 ${collectionName}`);
      console.log(`   Documents: ${count}`);
      console.log(`   Indexes: ${indexes.length}`);
      if (sample) {
        console.log(`   Fields: ${Object.keys(fieldAnalysis).length}`);
      }
      console.log('');
    }
    
    // Save detailed report to JSON
    const fs = require('fs');
    fs.writeFileSync(
      'mongodb-inspection-report.json',
      JSON.stringify(report, null, 2)
    );
    console.log('✅ Detailed report saved to: mongodb-inspection-report.json\n');
    
    // Print summary
    console.log('\n📋 COLLECTION SUMMARY:\n');
    report.collections.forEach(col => {
      console.log(`Collection: ${col.name}`);
      console.log(`  - Documents: ${col.documentCount}`);
      console.log(`  - Indexes: ${col.indexes.length}`);
      console.log(`  - Fields (${Object.keys(col.fields).length}):`);
      Object.entries(col.fields).forEach(([field, info]) => {
        console.log(`    • ${field}: ${info.type}`);
      });
      console.log('');
    });
    
  } catch (err) {
    console.error("❌ Error inspecting MongoDB:", err?.message || err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();

