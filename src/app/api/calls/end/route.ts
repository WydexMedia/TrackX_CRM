import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { callLogs, leadEvents } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { callLogId } = body || {};
    if (!callLogId) {
      return new Response(JSON.stringify({ success: false, error: "callLogId required" }), { status: 400 });
    }

    const rows = await db.select().from(callLogs).where(eq(callLogs.id, Number(callLogId))).limit(1);
    const row = rows[0];
    if (!row) return new Response(JSON.stringify({ success: false, error: "not found" }), { status: 404 });
    const now = new Date();
    const startedAt = row.startedAt ? new Date(row.startedAt as any) : now;
    const durationMs = Math.max(0, now.getTime() - startedAt.getTime());
    await db.update(callLogs).set({ endedAt: now, durationMs }).where(eq(callLogs.id, row.id));

    await db.insert(leadEvents).values({
      leadPhone: row.leadPhone,
      type: "CALL_ENDED",
      data: { callLogId: row.id, durationMs },
      actorId: row.salespersonId || null,
    } as any);

    return new Response(JSON.stringify({ success: true, durationMs }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "failed" }), { status: 500 });
  }
}


