import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { callLogs, leads, tasks, leadEvents } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { callLogId, completed, qualified, status, notes, followUp } = body || {};
    if (!callLogId) return new Response(JSON.stringify({ success: false, error: "callLogId required" }), { status: 400 });

    const rows = await db.select().from(callLogs).where(eq(callLogs.id, Number(callLogId))).limit(1);
    const log = rows[0];
    if (!log) return new Response(JSON.stringify({ success: false, error: "not found" }), { status: 404 });

    await db
      .update(callLogs)
      .set({ completed: !!completed, qualified: qualified ?? null, status: status || "NONE", notes: notes || null })
      .where(eq(callLogs.id, log.id));

    // follow-up task
    let followUpTaskId: number | undefined;
    if (status === "NEED_FOLLOW_UP" && followUp?.dueAt) {
      const ins = await db
        .insert(tasks)
        .values({
          leadPhone: log.leadPhone,
          title: followUp?.product ? `Follow-up: ${followUp.product}` : "Follow-up",
          status: "PENDING",
          type: "FOLLOW_UP",
          ownerId: log.salespersonId || null,
          dueAt: new Date(followUp.dueAt),
        } as any)
        .returning({ id: tasks.id });
      followUpTaskId = ins[0]?.id;
      await db.insert(leadEvents).values({
        leadPhone: log.leadPhone,
        type: "FOLLOW_UP_CREATED",
        data: { callLogId: log.id, followUpTaskId },
        actorId: log.salespersonId || null,
      } as any);
    }

    // lead status update for outcomes
    let redirect: string | undefined;
    const now = new Date();
    let newStage: string | undefined;
    if (status === "CONVERTED") newStage = "CONVERTED";
    else if (status === "NEED_FOLLOW_UP") newStage = "FOLLOW_UP";
    else if (status === "SEND_WHATSAPP") newStage = "SEND_WHATSAPP";
    else if (status === "NOT_INTERESTED") newStage = "NOT_INTERESTED";

    if (newStage) {
      await db.update(leads).set({ stage: newStage, updatedAt: now, lastActivityAt: now }).where(eq(leads.phone, log.leadPhone));
      await db.insert(leadEvents).values({ leadPhone: log.leadPhone, type: "LEAD_STATUS_CHANGED", data: { stage: newStage }, actorId: log.salespersonId || null } as any);
    }

    if (status === "CONVERTED") {
      redirect = `/form?leadPhone=${encodeURIComponent(log.leadPhone)}&name=${encodeURIComponent(" ")}&phone=${encodeURIComponent(log.phone)}`;
    }

    await db.insert(leadEvents).values({
      leadPhone: log.leadPhone,
      type: "CALL_OUTCOME_RECORDED",
      data: { callLogId: log.id, completed, qualified, status, notes, followUpTaskId },
      actorId: log.salespersonId || null,
    } as any);

    return new Response(JSON.stringify({ success: true, redirect }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "failed" }), { status: 500 });
  }
}


