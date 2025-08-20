import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { leadEvents } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const { phone, note } = await req.json();
    
    if (!phone || !note) {
      return new Response(JSON.stringify({ success: false, error: "Phone and note are required" }), { status: 400 });
    }

    // Add note event to lead events
    await db.insert(leadEvents).values({
      leadPhone: phone,
      type: "NOTE_ADDED",
      data: { note: note.trim() },
      actorId: null, // Will be set from user context if needed
      at: new Date()
    } as any);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to add note" }), { status: 500 });
  }
} 