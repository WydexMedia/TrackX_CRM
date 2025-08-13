import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { leads, tasks } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    // Simple placeholder KPIs derived from tasks and leads
    const assigned = await db.execute(sql`select owner_id as "ownerId", count(*)::int as "count" from leads where owner_id is not null group by owner_id order by count desc limit 10;`);
    const openTasks = await db.execute(sql`select owner_id as "ownerId", count(*)::int as "openTasks" from tasks where status = 'OPEN' group by owner_id;`);

    const tasksMap = new Map<string, number>();
    for (const row of (openTasks.rows as any[])) tasksMap.set(String(row.ownerId), Number(row.openTasks));

    const result = (assigned.rows as any[]).map((r) => ({
      user: { id: r.ownerId || "unassigned", name: r.ownerId || "Unassigned" },
      touches: tasksMap.get(r.ownerId) || 0,
      connects: Math.floor((tasksMap.get(r.ownerId) || 0) / 2),
      qualRate: 0,
      frtMedianSec: 0,
      openTasks: tasksMap.get(r.ownerId) || 0,
      breaches: 0,
    }));

    return new Response(JSON.stringify({ success: true, rows: result }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to fetch KPIs" }), { status: 500 });
  }
}


