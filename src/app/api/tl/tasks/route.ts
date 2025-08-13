import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { tasks } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db.select().from(tasks).orderBy(desc(tasks.createdAt)).limit(100);
    return new Response(JSON.stringify({ success: true, rows }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to fetch tasks" }), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadPhone, title, dueAt } = body || {};
    if (!leadPhone || !title) {
      return new Response(JSON.stringify({ success: false, error: "leadPhone and title required" }), { status: 400 });
    }
    const inserted = await db
      .insert(tasks)
      .values({ leadPhone, title, status: "OPEN", dueAt: dueAt ? new Date(dueAt) : null } as any)
      .returning({ id: tasks.id });
    return new Response(JSON.stringify({ success: true, id: inserted[0]?.id }), { status: 201 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to create task" }), { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body || {};
    if (!id || !status) {
      return new Response(JSON.stringify({ success: false, error: "id and status required" }), { status: 400 });
    }
    await db.update(tasks).set({ status }).where(eq(tasks.id, id));
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to update task" }), { status: 500 });
  }
}


