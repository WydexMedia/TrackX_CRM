import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { callLogs, leadEvents, leads } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { callLogId } = body || {};
    if (!callLogId) {
      return new Response(JSON.stringify({ success: false, error: "callLogId required" }), { status: 400 });
    }

    const rows = callLogId ? await db.select().from(callLogs).where(eq(callLogs.id, Number(callLogId))).limit(1) : [];
    const row = rows[0];
    if (!row) {
      // If there was no call_log persisted, still return success to unblock the flow
      return new Response(JSON.stringify({ success: true, durationMs: 0 }), { status: 200 });
    }
    const now = new Date();
    const startedAt = row.startedAt ? new Date(row.startedAt as any) : now;
    const durationMs = Math.max(0, now.getTime() - startedAt.getTime());
    await db.update(callLogs).set({ endedAt: now, durationMs }).where(eq(callLogs.id, row.id));

    // Resolve canonical lead phone
    const rawPhone = String((row as any).leadPhone || "");
    let canonicalPhone: string = rawPhone;
    try {
      const tryPhones: string[] = [rawPhone];
      const noSpace = rawPhone.replace(/\s+/g, "");
      if (noSpace !== rawPhone) tryPhones.push(noSpace);
      if (rawPhone.startsWith("+")) tryPhones.push(rawPhone.slice(1));
      else if (rawPhone) tryPhones.push(`+${rawPhone}`);
      for (const p of tryPhones) {
        const hit = await db.select().from(leads).where(eq(leads.phone, p)).limit(1);
        if (hit[0]) { canonicalPhone = p; break; }
      }
    } catch {}

    try {
      await db.insert(leadEvents).values({
        leadPhone: canonicalPhone,
        type: "CALL_ENDED",
        data: { callLogId: row.id, durationMs },
        actorId: row.salespersonId || null,
      } as any);
    } catch {}

    // bump last activity on the lead
    try {
      const now2 = new Date();
      await db.update(leads).set({ lastActivityAt: now2, updatedAt: now2 }).where(eq(leads.phone, canonicalPhone));
    } catch {}

    return new Response(JSON.stringify({ success: true, durationMs }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "failed" }), { status: 500 });
  }
}


