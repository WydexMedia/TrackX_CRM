import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { tasks } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get('ownerId');
    
    let query = db.select().from(tasks).orderBy(desc(tasks.createdAt));
    
    if (ownerId) {
      query = query.where(eq(tasks.ownerId, ownerId));
    }
    
    const rows = await query.limit(100);
    return new Response(JSON.stringify({ success: true, rows }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to fetch tasks" }), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadPhone, title, dueAt, ownerId, priority, type } = body || {};
    
    // For special tasks, leadPhone is optional
    if (!title) {
      return new Response(JSON.stringify({ success: false, error: "title is required" }), { status: 400 });
    }
    
    // For special tasks without a specific lead, we can use a placeholder or make it optional
    const taskData: any = {
      title,
      status: "OPEN",
      dueAt: dueAt ? new Date(dueAt) : null,
      type: type || "OTHER"
    };
    
    // Only add leadPhone if provided (for special tasks, this might be empty)
    if (leadPhone) {
      taskData.leadPhone = leadPhone;
    } else {
      // For special tasks without a specific lead, use a placeholder
      taskData.leadPhone = "SPECIAL_TASK";
    }
    
    // Add ownerId if provided (for assigning tasks to specific users)
    if (ownerId) {
      taskData.ownerId = ownerId;
    }
    
    // Add priority if provided
    if (priority) {
      taskData.priority = priority;
    }
    
    const inserted = await db
      .insert(tasks)
      .values(taskData)
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


