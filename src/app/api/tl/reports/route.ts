import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { requireTenantIdFromRequest } from "@/lib/tenant";

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

export async function GET(req: NextRequest) {
  try {
    let tenantId: number | undefined;
    try {
      tenantId = await requireTenantIdFromRequest(req as any);
    } catch (error) {
      console.error("Failed to resolve tenant:", error);
      // Return error instead of continuing with undefined tenantId
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Tenant not found or invalid" 
        }), 
        { status: 400 }
      );
    }

    const { from, to } = parseDateRange(req.url);
    console.log("Date range:", { from, to, dateRange: new URL(req.url).searchParams.get("dateRange") });

    const whereTimeRangeCalls = from && to ? sql`AND started_at BETWEEN ${from} AND ${to}` : sql``;
    const whereTimeRangeLeadsCreated = from && to ? sql`AND created_at BETWEEN ${from} AND ${to}` : sql``;
    const whereTimeRangeLeadsUpdated = from && to ? sql`AND updated_at BETWEEN ${from} AND ${to}` : sql``;
    const whereTimeRangeEvents = from && to ? sql`AND at BETWEEN ${from} AND ${to}` : sql``;

    // Calls per lead (started/completed)
    console.log("Executing callsPerLead query with tenantId:", tenantId);
    const callsPerLead = await db.execute(sql`
      SELECT lead_phone as "leadPhone",
             COUNT(*)::int as "started",
             COUNT(ended_at)::int as "completed"
      FROM call_logs
      WHERE tenant_id = ${tenantId}
      ${whereTimeRangeCalls}
      GROUP BY lead_phone
      ORDER BY COUNT(*) DESC
      LIMIT 10;
    `);

    // Assigned vs Converted per salesperson
    console.log("Executing assigned query with tenantId:", tenantId);
    const assigned = await db.execute(sql`
      SELECT owner_id as "ownerId", COUNT(*)::int as "assigned"
      FROM leads
      WHERE tenant_id = ${tenantId}
      AND owner_id IS NOT NULL
      ${whereTimeRangeLeadsCreated}
      GROUP BY owner_id;
    `);

    console.log("Executing converted query with tenantId:", tenantId);
    const converted = await db.execute(sql`
      SELECT owner_id as "ownerId", COUNT(*)::int as "converted"
      FROM leads
      WHERE tenant_id = ${tenantId}
      AND owner_id IS NOT NULL
      AND stage = 'Customer'
      ${whereTimeRangeLeadsUpdated}
      GROUP BY owner_id;
    `);

    const ownerMap: Record<string, { ownerId: string; assigned: number; converted: number }> = {};
    for (const r of (assigned.rows as any[])) {
      const k = String(r.ownerId);
      ownerMap[k] = { ownerId: k, assigned: Number(r.assigned) || 0, converted: 0 };
    }
    for (const r of (converted.rows as any[])) {
      const k = String(r.ownerId);
      ownerMap[k] = ownerMap[k] || { ownerId: k, assigned: 0, converted: 0 };
      ownerMap[k].converted = Number(r.converted) || 0;
    }
    const assignedVsConverted = Object.values(ownerMap).sort((a,b)=>b.assigned - a.assigned).slice(0, 20);

    // Average response time (first call - lead created)
    console.log("Executing avgRes query with tenantId:", tenantId);
    const avgRes = await db.execute(sql`
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
    `);

    const avgResponseMs = Number((avgRes.rows as any[])[0]?.avgMs || 0);

    // Conversion trends (daily/weekly/monthly) using STAGE_CHANGE to Customer
    console.log("Executing daily trends query with tenantId:", tenantId);
    const daily = await db.execute(sql`
      SELECT (date_trunc('day', at))::date AS period, COUNT(*)::int AS conversions
      FROM lead_events
      WHERE tenant_id = ${tenantId}
      AND type = 'STAGE_CHANGE'
      AND (data->>'to') = 'Customer'
      ${whereTimeRangeEvents}
      GROUP BY 1
      ORDER BY 1;
    `);
    
    console.log("Executing weekly trends query with tenantId:", tenantId);
    const weekly = await db.execute(sql`
      SELECT (date_trunc('week', at))::date AS period, COUNT(*)::int AS conversions
      FROM lead_events
      WHERE tenant_id = ${tenantId}
      AND type = 'STAGE_CHANGE'
      AND (data->>'to') = 'Customer'
      ${whereTimeRangeEvents}
      GROUP BY 1
      ORDER BY 1;
    `);
    
    console.log("Executing monthly trends query with tenantId:", tenantId);
    const monthly = await db.execute(sql`
      SELECT (date_trunc('month', at))::date AS period, COUNT(*)::int AS conversions
      FROM lead_events
      WHERE tenant_id = ${tenantId}
      AND type = 'STAGE_CHANGE'
      AND (data->>'to') = 'Customer'
      ${whereTimeRangeEvents}
      GROUP BY 1
      ORDER BY 1;
    `);

    return new Response(
      JSON.stringify({
        success: true,
        callsPerLead: callsPerLead.rows,
        assignedVsConverted,
        avgResponseMs,
        trends: {
          daily: daily.rows,
          weekly: weekly.rows,
          monthly: monthly.rows,
        },
      }),
      { status: 200 }
    );
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