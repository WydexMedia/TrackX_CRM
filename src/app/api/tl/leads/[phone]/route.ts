// No need for NextRequest in a Route Handler; use the standard Request type
import { db } from "@/db/client";
import { leads, leadEvents, tasks } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(_req: Request, { params }: any) {
  try {
    const phone = decodeURIComponent(params.phone);
    const lead = (await db.select().from(leads).where(eq(leads.phone, phone)))[0];
    if (!lead) return new Response(JSON.stringify({ success: false, error: "not found" }), { status: 404 });
    const events = await db.select().from(leadEvents).where(eq(leadEvents.leadPhone, phone)).orderBy(desc(leadEvents.at));
    const openTasks = await db.select().from(tasks).where(eq(tasks.leadPhone, phone)).orderBy(desc(tasks.createdAt));
    return new Response(JSON.stringify({ success: true, lead, events, tasks: openTasks }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "failed" }), { status: 500 });
  }
}


