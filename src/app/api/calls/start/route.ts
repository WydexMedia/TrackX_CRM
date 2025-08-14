import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { callLogs, leadEvents } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadPhone, phone, salespersonId } = body || {};
    if (!leadPhone || !phone) {
      return new Response(JSON.stringify({ success: false, error: "leadPhone and phone required" }), { status: 400 });
    }
    const inserted = await db
      .insert(callLogs)
      .values({ leadPhone, phone, salespersonId })
      .returning({ id: callLogs.id });

    // event
    await db.insert(leadEvents).values({
      leadPhone,
      type: "CALL_STARTED",
      data: { phone },
      actorId: salespersonId || null,
    } as any);

    return new Response(JSON.stringify({ success: true, callLogId: inserted[0]?.id }), { status: 201 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "failed" }), { status: 500 });
  }
}


