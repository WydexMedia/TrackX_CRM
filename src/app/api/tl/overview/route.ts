import { db } from "@/db/client";
import { leads, tasks } from "@/db/schema";
import { gte, sql } from "drizzle-orm";

export async function GET() {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const leadsTodayRow = await db
      .select({ c: sql<number>`count(*)` })
      .from(leads)
      .where(gte(leads.createdAt, startOfDay));
    const tasksCountRow = await db
      .select({ c: sql<number>`count(*)` })
      .from(tasks);

    return new Response(
      JSON.stringify({ success: true, widgets: { slaAtRisk: Number((tasksCountRow[0] as any)?.c || 0), leadsToday: Number((leadsTodayRow[0] as any)?.c || 0), qualifiedRate: 0 } }),
      { status: 200 }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to fetch overview" }), { status: 500 });
  }
}


