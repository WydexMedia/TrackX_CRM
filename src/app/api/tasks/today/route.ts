import { NextRequest } from "next/server";
import { and, isNull, eq, sql } from "drizzle-orm";
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
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfToday.getDate() + 1);

    const followUps = await db
      .select({ task: tasks, lead: leads })
      .from(tasks)
      .leftJoin(leads, eq(leads.phone, tasks.leadPhone))
      .where(
        and(
          sql`lower(${tasks.ownerId}) = lower(${ownerId}) OR lower(${tasks.ownerId}) = lower(${ownerName})`,
          eq(tasks.type as any, "FOLLOW_UP" as any),
          isNull(tasks.completedAt),
          sql`date_trunc('day', ${tasks.dueAt}) = date_trunc('day', ${sql.raw("now()")})`
        ) as any
      )
      .orderBy(sql`coalesce(${tasks.dueAt}, ${tasks.createdAt}) ASC` as any)
      .limit(200);

    // New leads currently assigned to this owner (show all assigned leads)
    const newLeads = await db
      .select()
      .from(leads)
      .where(sql`lower(${leads.ownerId}) = lower(${ownerId}) OR lower(${leads.ownerId}) = lower(${ownerName})` as any)
      .orderBy(sql`${leads.createdAt} DESC` as any)
      .limit(200);

    return new Response(JSON.stringify({ success: true, followUps, newLeads }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "failed" }), { status: 500 });
  }
}


