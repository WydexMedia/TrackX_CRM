import { NextRequest, NextResponse } from "next/server";
import { and, isNull, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { tasks, leads } from "@/db/schema";
import { getCachedResponse, addPerformanceHeaders, CACHE_DURATION } from "@/lib/performance";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get("ownerId") || "";
    const ownerName = searchParams.get("ownerName") || "";
    if (!ownerId) {
      return new Response(JSON.stringify({ success: false, error: "ownerId required" }), { status: 400 });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setHours(23, 59, 59, 999);

    // Use parallel execution with caching for better performance
    const cacheKey = `tasks-today:${ownerId}:${ownerName}:${startOfToday}`;
    
    const result = await getCachedResponse(
      cacheKey,
      async () => {
        // Execute both queries in parallel
        const [followUpsResult, newLeadsResult] = await Promise.all([
          db.execute(sql`
            SELECT t.*, l.name, l.email, l.source, l.stage
            FROM tasks t
            LEFT JOIN leads l ON l.phone = t.lead_phone
            WHERE (lower(t.owner_id) = lower(${ownerId}) OR lower(t.owner_id) = lower(${ownerName}))
              AND t.type = 'FOLLOWUP'
              AND t.completed_at IS NULL
              AND t.due_at >= ${startOfToday} AND t.due_at <= ${endOfToday}
            ORDER BY coalesce(t.due_at, t.created_at) ASC
            LIMIT 200
          `),
          
          db.execute(sql`
            SELECT *
            FROM leads
            WHERE lower(owner_id) = lower(${ownerId}) OR lower(owner_id) = lower(${ownerName})
            ORDER BY created_at DESC
            LIMIT 200
          `)
        ]);
        
        return {
          followUps: followUpsResult.rows,
          newLeads: newLeadsResult.rows
        };
      },
      CACHE_DURATION.SHORT // Short cache for real-time task data
    );

    const response = NextResponse.json({ success: true, ...result });
    return addPerformanceHeaders(response, CACHE_DURATION.SHORT);
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "failed" }), { status: 500 });
  }
}


