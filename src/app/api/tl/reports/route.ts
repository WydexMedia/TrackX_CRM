import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { requireTenantIdFromRequest } from "@/lib/tenant";
import { getCachedResponse, addPerformanceHeaders, withPerformanceMonitoring, CACHE_DURATION } from "@/lib/performance";

function parseDateRange(url: string) {
  const { searchParams } = new URL(url);
  let from = searchParams.get("from") || undefined;
  let to = searchParams.get("to") || undefined;
  const dateRange = searchParams.get("dateRange") || undefined; // today, yesterday, last7days, last30days, thismonth, lastmonth
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

  if (!from && !to && dateRange) {
    switch (dateRange) {
      case "today":
        from = startOfDay(now).toISOString();
        to = endOfDay(now).toISOString();
        break;
      case "yesterday": {
        const y = new Date(now);
        y.setDate(now.getDate() - 1);
        from = startOfDay(y).toISOString();
        to = endOfDay(y).toISOString();
        break;
      }
      case "last7days": {
        const s = new Date(now);
        s.setDate(now.getDate() - 7);
        from = startOfDay(s).toISOString();
        to = endOfDay(now).toISOString();
        break;
      }
      case "last30days": {
        const s = new Date(now);
        s.setDate(now.getDate() - 30);
        from = startOfDay(s).toISOString();
        to = endOfDay(now).toISOString();
        break;
      }
      case "thismonth": {
        const s = startOfMonth(now);
        const e = endOfMonth(now);
        from = s.toISOString();
        to = e.toISOString();
        break;
      }
      case "lastmonth": {
        const s = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        const e = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        from = s.toISOString();
        to = e.toISOString();
        break;
      }
    }
  }

  return { from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined };
}

// Optimized reports data fetcher with parallel queries
const fetchReportsData = withPerformanceMonitoring(async (tenantId: number, from?: Date, to?: Date) => {
  const whereTimeRangeCalls = from && to ? sql`AND started_at BETWEEN ${from} AND ${to}` : sql``;
  const whereTimeRangeLeadsCreated = from && to ? sql`AND created_at BETWEEN ${from} AND ${to}` : sql``;
  const whereTimeRangeLeadsUpdated = from && to ? sql`AND updated_at BETWEEN ${from} AND ${to}` : sql``;
  const whereTimeRangeEvents = from && to ? sql`AND at BETWEEN ${from} AND ${to}` : sql``;

  // Execute all queries in parallel for better performance
  const [callsPerLeadResult, assignedResult, convertedResult, avgResResult, dailyResult, weeklyResult, monthlyResult] = await Promise.all([
    // Calls per lead
    db.execute(sql`
      SELECT lead_phone as "leadPhone",
             COUNT(*)::int as "started",
             COUNT(ended_at)::int as "completed"
      FROM call_logs
      WHERE tenant_id = ${tenantId}
      ${whereTimeRangeCalls}
      GROUP BY lead_phone
      ORDER BY COUNT(*) DESC
      LIMIT 10;
    `),
    
    // Assigned leads
    db.execute(sql`
      SELECT owner_id as "ownerId", COUNT(*)::int as "assigned"
      FROM leads
      WHERE tenant_id = ${tenantId}
      AND owner_id IS NOT NULL
      ${whereTimeRangeLeadsCreated}
      GROUP BY owner_id;
    `),
    
    // Converted leads
    db.execute(sql`
      SELECT owner_id as "ownerId", COUNT(*)::int as "converted"
      FROM leads
      WHERE tenant_id = ${tenantId}
      AND owner_id IS NOT NULL
      AND stage = 'Customer'
      ${whereTimeRangeLeadsUpdated}
      GROUP BY owner_id;
    `),
    
    // Average response time
    db.execute(sql`
      WITH first_calls AS (
        SELECT lead_phone, MIN(started_at) AS first_call
        FROM call_logs
        WHERE tenant_id = ${tenantId}
        GROUP BY lead_phone
      )
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (fc.first_call - l.created_at)) * 1000), 0)::bigint AS "avgMs"
      FROM leads l
      JOIN first_calls fc ON fc.lead_phone = l.phone
      WHERE l.tenant_id = ${tenantId}
      ${whereTimeRangeLeadsCreated};
    `),
    
    // Daily trends
    db.execute(sql`
      SELECT (date_trunc('day', at))::date AS period, COUNT(*)::int AS conversions
      FROM lead_events
      WHERE tenant_id = ${tenantId}
        AND type = 'STAGE_CHANGE'
        AND (data->>'to') = 'Customer'
      ${whereTimeRangeEvents}
      GROUP BY period
      ORDER BY period DESC
      LIMIT 30;
    `),
    
    // Weekly trends
    db.execute(sql`
      SELECT (date_trunc('week', at))::date AS period, COUNT(*)::int AS conversions
      FROM lead_events
      WHERE tenant_id = ${tenantId}
        AND type = 'STAGE_CHANGE'
        AND (data->>'to') = 'Customer'
      ${whereTimeRangeEvents}
      GROUP BY period
      ORDER BY period DESC
      LIMIT 12;
    `),
    
    // Monthly trends
    db.execute(sql`
      SELECT (date_trunc('month', at))::date AS period, COUNT(*)::int AS conversions
      FROM lead_events
      WHERE tenant_id = ${tenantId}
        AND type = 'STAGE_CHANGE'
        AND (data->>'to') = 'Customer'
      ${whereTimeRangeEvents}
      GROUP BY period
      ORDER BY period DESC
      LIMIT 12;
    `)
  ]);

  return {
    callsPerLead: callsPerLeadResult.rows as any[],
    assigned: assignedResult.rows as any[],
    converted: convertedResult.rows as any[],
    avgResponseMs: Number((avgResResult.rows as any[])[0]?.avgMs || 0),
    daily: dailyResult.rows as any[],
    weekly: weeklyResult.rows as any[],
    monthly: monthlyResult.rows as any[]
  };
}, 'fetchReportsData');

export async function GET(req: NextRequest) {
  try {
    const tenantId = await requireTenantIdFromRequest(req as any).catch(() => undefined);
    
    if (!tenantId) {
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
      const subdomain = req.headers.get("x-tenant-subdomain");
      console.log("Tenant resolution failed - Debug info:", { host, subdomain });
      console.log("Available headers:", Object.fromEntries(req.headers.entries()));
      
      // Return empty data structure instead of error to match frontend expectations
      return new Response(
        JSON.stringify({
          success: true,
          callsPerLead: [],
          assignedVsConverted: [],
          avgResponseMs: 0,
          trends: {
            daily: [],
            weekly: [],
            monthly: [],
          },
        }),
        { status: 200 }
      );
    }

    const { from, to } = parseDateRange(req.url);
    
    // Use caching for reports data with parallel queries
    const cacheKey = `reports:${tenantId}:${from?.getTime()}:${to?.getTime()}`;
    const { callsPerLead, assigned, converted, avgResponseMs, daily, weekly, monthly } = await getCachedResponse(
      cacheKey,
      () => fetchReportsData(tenantId, from, to),
      CACHE_DURATION.MEDIUM
    );

    // Process assigned vs converted data
    const ownerMap: Record<string, { ownerId: string; assigned: number; converted: number }> = {};
    for (const r of assigned) {
      const k = String(r.ownerId);
      ownerMap[k] = { ownerId: k, assigned: Number(r.assigned) || 0, converted: 0 };
    }
    for (const r of converted) {
      const k = String(r.ownerId);
      ownerMap[k] = ownerMap[k] || { ownerId: k, assigned: 0, converted: 0 };
      ownerMap[k].converted = Number(r.converted) || 0;
    }
    const assignedVsConverted = Object.values(ownerMap).sort((a,b)=>b.assigned - a.assigned).slice(0, 20);

    // Build response with performance headers
    const response = NextResponse.json({
      success: true,
      callsPerLead,
      assignedVsConverted,
      avgResponseMs,
      trends: {
        daily,
        weekly,
        monthly,
      },
    });

    return addPerformanceHeaders(response, CACHE_DURATION.MEDIUM);
  } catch (e: any) {
    console.error("Reports API error:", e);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: e?.message || "Failed to build reports",
        details: process.env.NODE_ENV === 'development' ? e?.stack : undefined
      }), 
      { status: 500 }
    );
  }
} 