import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { getTenantContextFromRequest } from '@/lib/mongoTenant';

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (!clientPromise) {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function GET(request) {
  try {
    // Get tenant context (no authentication required)
    const { tenantSubdomain } = await getTenantContextFromRequest(request);
    const client = await clientPromise;
    const db = client.db();
    const sales = db.collection('sales');
    
    // Build query to filter by tenant only
    const query = {};
    
    // Add tenant filtering
    if (tenantSubdomain) {
      query.tenantSubdomain = tenantSubdomain;
    }
    
    // Get all sales for the tenant (no user filtering for public leaderboard)
    const allSales = await sales
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
    
    return NextResponse.json(allSales);
  } catch (error) {
    console.error('Error fetching public leaderboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard data' }, { status: 500 });
  }
}
