import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { tasks, leads } from "@/db/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { getTenantContextFromRequest } from "@/lib/mongoTenant";
import { authenticateRequest, createUnauthorizedResponse } from "@/lib/clerkAuth";
import { getCachedResponse, addPerformanceHeaders, withPerformanceMonitoring, CACHE_DURATION } from "@/lib/performance";

// Optimized task fetcher with joins
const fetchOptimizedTasks = withPerformanceMonitoring(async (tenantId: number, filters: any = {}) => {
  const { status, ownerId, limit = 100, offset = 0 } = filters;
  
  // Build dynamic where conditions
  const conditions = [eq(tasks.tenantId, tenantId)];
  
  if (status) {
    conditions.push(eq(tasks.status, status));
  }
  
  if (ownerId) {
    conditions.push(eq(tasks.ownerId, ownerId));
  }
  
  // Use optimized query with joins to get lead information
  const result = await db
    .select({
      // Task fields
      id: tasks.id,
      leadPhone: tasks.leadPhone,
      title: tasks.title,
      status: tasks.status,
      type: tasks.type,
      priority: tasks.priority,
      dueAt: tasks.dueAt,
      completedAt: tasks.completedAt,
      ownerId: tasks.ownerId,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      // Lead fields
      leadName: leads.name,
      leadEmail: leads.email,
      leadSource: leads.source,
      leadStage: leads.stage,
    })
    .from(tasks)
    .leftJoin(leads, and(
      eq(leads.phone, tasks.leadPhone),
      eq(leads.tenantId, tenantId)
    ))
    .where(and(...conditions))
    .orderBy(desc(tasks.dueAt), asc(tasks.priority))
    .limit(limit)
    .offset(offset);
  
  return result;
}, 'fetchOptimizedTasks');

// Get task statistics
const fetchTaskStats = withPerformanceMonitoring(async (tenantId: number) => {
  const result = await db.execute(sql`
    SELECT 
      status,
      COUNT(*) as count,
      COUNT(CASE WHEN due_at < NOW() AND status NOT IN ('DONE', 'SKIPPED') THEN 1 END) as overdue
    FROM tasks 
    WHERE tenant_id = ${tenantId}
    GROUP BY status
  `);
  
  return result.rows as any[];
}, 'fetchTaskStats');

export async function GET(req: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(req);
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error || 'Authentication failed', authResult.statusCode);
    }

    const { tenantId } = await getTenantContextFromRequest(req as any);
    
    if (!tenantId) {
      return new Response(
        JSON.stringify({ success: false, error: "Tenant not found" }), 
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const ownerId = searchParams.get("ownerId");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const includeStats = searchParams.get("includeStats") === "true";

    const filters = { status, ownerId, limit, offset };
    
    // Use caching for task data
    const cacheKey = `tasks:${tenantId}:${JSON.stringify(filters)}`;
    const tasksData = await getCachedResponse(
      cacheKey,
      () => fetchOptimizedTasks(tenantId, filters),
      CACHE_DURATION.SHORT // Short cache for real-time task updates
    );

    let stats = null;
    if (includeStats) {
      const statsCacheKey = `task-stats:${tenantId}`;
      stats = await getCachedResponse(
        statsCacheKey,
        () => fetchTaskStats(tenantId),
        CACHE_DURATION.MEDIUM
      );
    }

    const response = NextResponse.json({
      success: true,
      tasks: tasksData,
      stats,
      pagination: {
        limit,
        offset,
        hasMore: tasksData.length === limit
      }
    });

    return addPerformanceHeaders(response, CACHE_DURATION.SHORT);
  } catch (e: any) {
    console.error("Optimized Tasks API error:", e);
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to fetch tasks" }), { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(req);
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error || 'Authentication failed', authResult.statusCode);
    }

    const { tenantId } = await getTenantContextFromRequest(req as any);
    
    if (!tenantId) {
      return new Response(
        JSON.stringify({ success: false, error: "Tenant not found" }), 
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const taskId = parseInt(searchParams.get("id") || "0");
    
    if (!taskId) {
      return new Response(
        JSON.stringify({ success: false, error: "Task ID is required" }), 
        { status: 400 }
      );
    }

    const updates = await req.json();
    
    // Update task
    const result = await db
      .update(tasks)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(and(
        eq(tasks.id, taskId),
        eq(tasks.tenantId, tenantId)
      ))
      .returning();

    if (result.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Task not found" }), 
        { status: 404 }
      );
    }

    // Clear relevant caches
    const { clearCache } = await import("@/lib/performance");
    clearCache(`tasks:${tenantId}:*`);
    clearCache(`task-stats:${tenantId}`);

    const response = NextResponse.json({
      success: true,
      task: result[0]
    });

    return addPerformanceHeaders(response, CACHE_DURATION.SHORT);
  } catch (e: any) {
    console.error("Task update error:", e);
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to update task" }), { status: 500 });
  }
}




