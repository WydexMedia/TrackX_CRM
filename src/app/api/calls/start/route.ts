import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { callLogs, leadEvents, leads } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireTenantIdFromRequest } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadPhone, phone, salespersonId } = body || {};
    const tenantId = await requireTenantIdFromRequest(req as any).catch(() => undefined);
    if (!leadPhone || !phone) {
      return new Response(JSON.stringify({ success: false, error: "leadPhone and phone required" }), { status: 400 });
    }
    // Normalize leadPhone to the canonical value stored in leads, if possible
    let canonicalPhone: string = String(leadPhone);
    try {
      const raw = String(leadPhone || "");
      const tryPhones: string[] = [raw];
      const noSpace = raw.replace(/\s+/g, "");
      if (noSpace !== raw) tryPhones.push(noSpace);
      if (raw.startsWith("+")) tryPhones.push(raw.slice(1));
      else if (raw) tryPhones.push(`+${raw}`);
      for (const p of tryPhones) {
        const hit = await db.select().from(leads).where(tenantId ? and(eq(leads.phone, p), eq(leads.tenantId, tenantId)) : eq(leads.phone, p)).limit(1);
        if (hit[0]) { canonicalPhone = p; break; }
      }
    } catch {}

    let insertedId: number | null = null;
    try {
      const inserted = await db
        .insert(callLogs)
        .values({ leadPhone: canonicalPhone, phone, salespersonId, tenantId: tenantId || null })
        .returning({ id: callLogs.id });
      insertedId = inserted[0]?.id ?? null;
    } catch {
      // If call_logs table is missing, proceed without persisting the log
      insertedId = null;
    }

    // event
    try {
      await db.insert(leadEvents).values({
        leadPhone: canonicalPhone,
        type: "CALL_STARTED",
        data: { phone },
        actorId: salespersonId || null,
        tenantId: tenantId || null,
      } as any);
    } catch {}

    // bump last activity on the lead
    try {
      const now = new Date();
      await db.update(leads).set({ lastActivityAt: now, updatedAt: now }).where(tenantId ? and(eq(leads.phone, canonicalPhone), eq(leads.tenantId, tenantId)) : eq(leads.phone, canonicalPhone));
    } catch {}

    return new Response(JSON.stringify({ success: true, callLogId: insertedId }), { status: 201 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "failed" }), { status: 500 });
  }
}


