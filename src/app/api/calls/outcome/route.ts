import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { callLogs, leads, tasks, leadEvents } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { callLogId, completed, qualified, status, notes, followUp, leadPhone: leadPhoneOverride, phone: dialedPhone } = body || {};
    if (!callLogId && !leadPhoneOverride) return new Response(JSON.stringify({ success: false, error: "callLogId or leadPhone required" }), { status: 400 });

    const rows = callLogId ? await db.select().from(callLogs).where(eq(callLogs.id, Number(callLogId))).limit(1) : [];
    const log = rows[0] || { leadPhone: leadPhoneOverride || "", phone: dialedPhone || "", salespersonId: null } as any;

    // Resolve canonical lead phone as stored in leads table
    const rawPhone = String(leadPhoneOverride || (log as any).leadPhone || "");
    let canonicalPhone: string = rawPhone;
    const tryPhones: string[] = [rawPhone];
    const noSpace = rawPhone.replace(/\s+/g, "");
    if (noSpace !== rawPhone) tryPhones.push(noSpace);
    if (rawPhone.startsWith("+")) tryPhones.push(rawPhone.slice(1));
    else if (rawPhone) tryPhones.push(`+${rawPhone}`);
    for (const p of tryPhones) {
      const leadHit = await db.select().from(leads).where(eq(leads.phone, p)).limit(1);
      if (leadHit[0]) { canonicalPhone = p; break; }
    }

    try {
      if ((log as any).id) {
        await db
          .update(callLogs)
          .set({ completed: !!completed, qualified: qualified ?? null, status: status || "NONE", notes: notes || null })
          .where(eq(callLogs.id, (log as any).id));
      }
    } catch {}

    // follow-up task
    let followUpTaskId: number | undefined;
    if (status === "NEED_FOLLOW_UP" && followUp?.dueAt) {
      try {
        const ins = await db
          .insert(tasks)
          .values({
            leadPhone: canonicalPhone,
            title: followUp?.product ? `Follow-up: ${followUp.product}` : "Follow-up",
            status: "PENDING",
            type: "FOLLOW_UP",
            ownerId: (log as any).salespersonId || null,
            dueAt: new Date(followUp.dueAt),
          } as any)
          .returning({ id: tasks.id });
        followUpTaskId = ins[0]?.id;
      } catch {}
      try {
        await db.insert(leadEvents).values({
          leadPhone: canonicalPhone,
          type: "FOLLOW_UP_CREATED",
          data: { callLogId: (log as any).id || null, followUpTaskId },
          actorId: (log as any).salespersonId || null,
        } as any);
      } catch {}
    }

    // lead status update for outcomes
    let redirect: string | undefined;
    const now = new Date();
    let newStage: string | undefined;
    // Map call outcome statuses to lead stages
    switch (status) {
      case "CONVERTED":
        newStage = "CONVERTED";
        break;
      case "NEED_FOLLOW_UP":
        newStage = "FOLLOW_UP";
        break;
      case "SEND_WHATSAPP":
        newStage = "SEND_WHATSAPP";
        break;
      case "NOT_INTERESTED":
        newStage = "NOT_INTERESTED";
        break;
      case "DNP":
        newStage = "DNP";
        break;
      case "DNC":
        newStage = "DNC";
        break;
      case "ASKED_TO_CALL_BACK":
        newStage = "CALLBACK";
        break;
      case "INTERESTED":
        newStage = "INTERESTED";
        break;
      case "QUALIFIED":
        newStage = "QUALIFIED";
        break;
      case "NIFC":
        newStage = "NIFC";
        break;
      case "DISQUALIFIED":
        newStage = "DISQUALIFIED";
        break;
      case "PROSPECT":
        newStage = "PROSPECT";
        break;
      case "PAYMENT_INITIAL":
        newStage = "PAYMENT_INITIAL";
        break;
      case "PAYMENT_DONE":
        newStage = "PAYMENT_DONE";
        break;
      case "SALES_CLOSED":
        newStage = "SALES_CLOSED";
        break;
      case "CUSTOMER":
        newStage = "CUSTOMER";
        break;
      case "NOT_CONTACTED":
        newStage = "NOT_CONTACTED";
        break;
    }

    if (newStage) {
      // capture previous stage for better timeline readability
      try {
        const prevLead = (await db.select().from(leads).where(eq(leads.phone, canonicalPhone)).limit(1))[0] as any;
        const prevStage = prevLead?.stage || null;
        await db.update(leads).set({ stage: newStage, updatedAt: now, lastActivityAt: now }).where(eq(leads.phone, canonicalPhone));
        await db.insert(leadEvents).values({ 
          leadPhone: canonicalPhone, 
          type: "STAGE_CHANGE", 
          data: { 
            from: prevStage, 
            to: newStage,
            actorId: (log as any).salespersonId || null,
            message: `Stage changed from ${prevStage} to ${newStage}`
          }, 
          actorId: (log as any).salespersonId || null 
        } as any);
      } catch {}
    } else {
      try {
        await db.update(leads).set({ lastActivityAt: now, updatedAt: now }).where(eq(leads.phone, canonicalPhone));
      } catch {}
    }

    if (status === "CONVERTED") {
      redirect = `/form?leadPhone=${encodeURIComponent(canonicalPhone)}&name=${encodeURIComponent(" ")}&phone=${encodeURIComponent(log.phone)}`;
    }

    try {
      await db.insert(leadEvents).values({
        leadPhone: canonicalPhone,
        type: "CALL_OUTCOME",
        data: { callLogId: (log as any).id || null, completed, qualified, status, notes, followUpTaskId },
        actorId: (log as any).salespersonId || null,
      } as any);
    } catch {}

    return new Response(JSON.stringify({ success: true, redirect }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "failed" }), { status: 500 });
  }
}


