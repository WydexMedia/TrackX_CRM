import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { sales } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getTenantContextFromRequest } from '@/lib/mongoTenant';

export async function GET(request) {
  try {
    // Get tenant context (no authentication required)
    const { tenantId } = await getTenantContextFromRequest(request);
    
    if (!tenantId) {
      return NextResponse.json([]);
    }
    
    // Get all sales for the tenant (no user filtering for public leaderboard)
    const allSales = await db
      .select()
      .from(sales)
      .where(eq(sales.tenantId, tenantId))
      .orderBy(desc(sales.createdAt));
    
    return NextResponse.json(allSales);
  } catch (error) {
    console.error('Error fetching public leaderboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard data' }, { status: 500 });
  }
}
