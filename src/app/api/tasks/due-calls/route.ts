import { NextRequest } from "next/server";
import { and, lt, isNull, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { tasks, leads } from "@/db/schema";

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

    try {
      const rows = await db
        .select({
          task: tasks,
          lead: leads,
        })
        .from(tasks)
        .leftJoin(leads, eq(leads.phone, tasks.leadPhone))
        .where(
          and(
            sql`(lower(${tasks.ownerId}) = lower(${ownerId}) OR lower(${tasks.ownerId}) = lower(${ownerName}))`,
            eq(tasks.type as any, "CALL" as any),
            isNull(tasks.completedAt),
            lt(tasks.dueAt, startOfToday)
          ) as any
        )
        .orderBy(sql`coalesce(${tasks.dueAt}, ${tasks.createdAt}) ASC` as any)
        .limit(200);

      return new Response(JSON.stringify({ success: true, rows }), { status: 200 });
    } catch (e: any) {
      // Return empty instead of 500 to avoid breaking dashboard
      return new Response(JSON.stringify({ success: true, rows: [], hint: e?.message || "query failed" }), { status: 200 });
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "failed" }), { status: 500 });
  }
}


