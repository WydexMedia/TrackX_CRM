import { db } from "@/db/client";
import { leads, tasks } from "@/db/schema";
import { gte, sql, eq, and } from "drizzle-orm";
import { getTenantContextFromRequest } from "@/lib/mongoTenant";
import { authenticateToken, createUnauthorizedResponse } from "@/lib/authMiddleware";

export async function GET(req: Request) {
  try {
    // Authenticate the request
    const authResult = await authenticateToken(req as any);
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, authResult.errorCode, authResult.statusCode);
    }

    const { tenantId } = await getTenantContextFromRequest(req as any);
    
    if (!tenantId) {
      return new Response(
        JSON.stringify({ success: false, error: "Tenant not found" }), 
        { status: 404 }
      );
    }

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    // Get leads created today for this tenant
    const leadsTodayRow = await db
      .select({ c: sql<number>`count(*)` })
      .from(leads)
      .where(and(
        gte(leads.createdAt, startOfDay),
        eq(leads.tenantId, tenantId)
      ));

    // Get total leads for this tenant
    const totalLeadsRow = await db
      .select({ c: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.tenantId, tenantId));

    // Get qualified leads (assuming "Qualified" stage means qualified)
    const qualifiedLeadsRow = await db
      .select({ c: sql<number>`count(*)` })
      .from(leads)
      .where(and(
        eq(leads.tenantId, tenantId),
        eq(leads.stage, "Qualified")
      ));

    // Get tasks at risk (overdue tasks)
    const overdueTasksRow = await db
      .select({ c: sql<number>`count(*)` })
      .from(tasks)
      .where(and(
        eq(tasks.tenantId, tenantId),
        sql`${tasks.dueAt} < NOW() AND ${tasks.status} != 'DONE'`
      ));

    const totalLeads = Number((totalLeadsRow[0] as any)?.c || 0);
    const qualifiedLeads = Number((qualifiedLeadsRow[0] as any)?.c || 0);
    const qualifiedRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

    return new Response(
      JSON.stringify({ 
        success: true, 
        widgets: { 
          slaAtRisk: Number((overdueTasksRow[0] as any)?.c || 0), 
          leadsToday: Number((leadsTodayRow[0] as any)?.c || 0), 
          qualifiedRate: qualifiedRate 
        } 
      }),
      { status: 200 }
    );
  } catch (e: any) {
    console.error("Overview API error:", e);
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to fetch overview" }), { status: 500 });
  }
}


