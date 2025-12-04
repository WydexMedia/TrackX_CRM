import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { users, teamAssignments } from "@/db/schema";
import { eq, and, inArray, or } from "drizzle-orm";
import { getTenantContextFromRequest } from "@/lib/mongoTenant";

interface TeamAssignment {
  salespersonId: string;
  jlId: string;
  status: string;
  tenantId?: number;
}

interface User {
  id: number;
  code: string | null;
  name: string | null;
  email: string;
  role: string;
  target?: number | null;
  tenantId?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    
    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID is required" }), { status: 400 });
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("Team management request for userId:", userId);
    }
    
    // Get tenant context
    const { tenantSubdomain, tenantId } = await getTenantContextFromRequest(request);
    if (process.env.NODE_ENV !== "production") {
      console.log("Tenant context:", { tenantSubdomain, tenantId });
    }
    
    // Find current user by email (userId is email in this context)
    let currentUser;
    if (tenantId) {
      const userResult = await db
        .select({
          id: users.id,
          code: users.code,
          name: users.name,
          email: users.email,
          role: users.role,
          target: users.target,
          tenantId: users.tenantId,
        })
        .from(users)
        .where(and(
          eq(users.email, userId),
          eq(users.tenantId, tenantId)
        ))
        .limit(1);
      currentUser = userResult[0];
    } else {
      const userResult = await db
        .select({
          id: users.id,
          code: users.code,
          name: users.name,
          email: users.email,
          role: users.role,
          target: users.target,
          tenantId: users.tenantId,
        })
        .from(users)
        .where(eq(users.email, userId))
        .limit(1);
      currentUser = userResult[0];
    }

    if (!currentUser) {
      return new Response(JSON.stringify({ 
        error: "User not found",
      }), { status: 404 });
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("Found user:", currentUser.name, "Role:", currentUser.role);
    }

    // Get all users for this tenant
    let allUsers;
    if (tenantId) {
      allUsers = await db
        .select({
          id: users.id,
          code: users.code,
          name: users.name,
          email: users.email,
          role: users.role,
          target: users.target,
        })
        .from(users)
        .where(and(
          eq(users.tenantId, tenantId),
          inArray(users.role, ["teamleader", "jl", "sales"])
        ));
    } else {
      allUsers = await db
        .select({
          id: users.id,
          code: users.code,
          name: users.name,
          email: users.email,
          role: users.role,
          target: users.target,
        })
        .from(users)
        .where(inArray(users.role, ["teamleader", "jl", "sales"]));
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("Found users with filtered roles:", allUsers.length);
    }

    // Get team assignments for this tenant
    let teamAssignmentsList: TeamAssignment[] = [];
    if (tenantId) {
      const assignments = await db
        .select({
          salespersonId: teamAssignments.salespersonId,
          jlId: teamAssignments.jlId,
          status: teamAssignments.status,
        })
        .from(teamAssignments)
        .where(and(
          eq(teamAssignments.tenantId, tenantId),
          eq(teamAssignments.status, "active")
        ));
      
      // Convert to format expected by client (using user IDs/codes)
      // We need to map user IDs to codes for the mapping
      const userCodeMap = new Map<number, string>();
      allUsers.forEach(u => userCodeMap.set(u.id, u.code || u.email));

      teamAssignmentsList = assignments.map(a => ({
        salespersonId: userCodeMap.get(a.salespersonId) || String(a.salespersonId),
        jlId: userCodeMap.get(a.jlId) || String(a.jlId),
        status: a.status,
        tenantId: tenantId,
      }));
    }

    // Create a map of salesperson code to JL code
    const salesToJlMap = new Map<string, string>();
    teamAssignmentsList.forEach((assignment: TeamAssignment) => {
      salesToJlMap.set(assignment.salespersonId, assignment.jlId);
    });

    // Create a map of JL code to salesperson codes
    const jlToSalesMap = new Map<string, string[]>();
    teamAssignmentsList.forEach((assignment: TeamAssignment) => {
      if (!jlToSalesMap.has(assignment.jlId)) {
        jlToSalesMap.set(assignment.jlId, []);
      }
      jlToSalesMap.get(assignment.jlId)!.push(assignment.salespersonId);
    });

    let teamData;

    if (currentUser.role === "teamleader") {
      // Team Leader sees all users and their assignments
      teamData = {
        allUsers: allUsers.map((user: User) => ({
          id: user.id,
          code: user.code,
          name: user.name,
          email: user.email,
          role: user.role,
          target: user.target || 0,
          assignedTo: user.role === "sales" ? salesToJlMap.get(user.code || user.email) : null
        })),
        juniorLeaders: allUsers.filter((user: User) => user.role === "jl").map((jl: User) => ({
          id: jl.id,
          code: jl.code,
          name: jl.name,
          email: jl.email,
          role: jl.role,
          target: jl.target || 0,
          teamMembers: jlToSalesMap.get(jl.code || jl.email) || []
        })),
        salesPersons: allUsers.filter((user: User) => user.role === "sales").map((sales: User) => ({
          id: sales.id,
          code: sales.code,
          name: sales.name,
          email: sales.email,
          role: sales.role,
          target: sales.target || 0,
          assignedTo: salesToJlMap.get(sales.code || sales.email)
        }))
      };
    } else if (currentUser.role === "jl") {
      // Junior Leader sees only their assigned team
      const assignedSales = jlToSalesMap.get(currentUser.code || currentUser.email) || [];
      teamData = {
        allUsers: allUsers.filter((user: User) => 
          (user.code || user.email) === (currentUser.code || currentUser.email) || assignedSales.includes(user.code || user.email)
        ).map(u => ({
          id: u.id,
          code: u.code,
          name: u.name,
          email: u.email,
          role: u.role,
          target: u.target || 0,
        })),
        juniorLeaders: [{
          id: currentUser.id,
          code: currentUser.code,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
          target: currentUser.target || 0,
        }],
        salesPersons: allUsers.filter((user: User) => 
          user.role === "sales" && assignedSales.includes(user.code || user.email)
        ).map((sales: User) => ({
          id: sales.id,
          code: sales.code,
          name: sales.name,
          email: sales.email,
          role: sales.role,
          target: sales.target || 0,
          assignedTo: currentUser.code || currentUser.email
        }))
      };
    } else {
      // Sales person sees only themselves
      teamData = {
        allUsers: [{
          id: currentUser.id,
          code: currentUser.code,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
          target: currentUser.target || 0,
        }],
        juniorLeaders: [],
        salesPersons: [{
          id: currentUser.id,
          code: currentUser.code,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
          target: currentUser.target || 0,
        }]
      };
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("Returning team data for role:", currentUser.role);
    }
    return new Response(JSON.stringify({ teamData }), { status: 200 });
  } catch (error) {
    console.error("Team management error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch team data" }), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, targetUserId, jlId, userId } = body;

    if (!action || !targetUserId || !userId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // Get tenant context
    const { tenantId } = await getTenantContextFromRequest(request);

    if (!tenantId) {
      return new Response(JSON.stringify({ error: "Tenant context required" }), { status: 400 });
    }

    // Get current user by email
    const currentUserResult = await db
      .select({
        id: users.id,
        code: users.code,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(and(
        eq(users.email, userId),
        eq(users.tenantId, tenantId)
      ))
      .limit(1);

    const currentUser = currentUserResult[0];
    if (!currentUser) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    // Get target user by code
    const targetUserResult = await db
      .select({
        id: users.id,
        code: users.code,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(and(
        eq(users.code, targetUserId),
        eq(users.tenantId, tenantId)
      ))
      .limit(1);

    const targetUser = targetUserResult[0];
    if (!targetUser) {
      return new Response(JSON.stringify({ error: "Target user not found" }), { status: 404 });
    }

    if (action === "promote_to_jl") {
      // Only team leaders can promote to JL
      if (currentUser.role !== "teamleader") {
        return new Response(JSON.stringify({ error: "Only team leaders can promote users" }), { status: 403 });
      }

      if (targetUser.role !== "sales") {
        return new Response(JSON.stringify({ error: "Only sales persons can be promoted to JL" }), { status: 400 });
      }

      // Update user role to JL
      await db
        .update(users)
        .set({ role: "jl" })
        .where(eq(users.id, targetUser.id));

      // Remove any existing team assignments for this user
      await db
        .update(teamAssignments)
        .set({ 
          status: "inactive",
          deactivatedAt: new Date()
        })
        .where(and(
          eq(teamAssignments.salespersonId, targetUser.id),
          eq(teamAssignments.tenantId, tenantId)
        ));

      return new Response(JSON.stringify({ success: true, message: "User promoted to JL successfully" }), { status: 200 });

    } else if (action === "demote_to_sales") {
      // Only team leaders can demote JLs
      if (currentUser.role !== "teamleader") {
        return new Response(JSON.stringify({ error: "Only team leaders can demote users" }), { status: 403 });
      }

      if (targetUser.role !== "jl") {
        return new Response(JSON.stringify({ error: "Only Junior Leaders can be demoted to sales" }), { status: 400 });
      }

      // Check if this JL has any assigned sales persons
      const assignedSales = await db
        .select()
        .from(teamAssignments)
        .where(and(
          eq(teamAssignments.jlId, targetUser.id),
          eq(teamAssignments.status, "active"),
          eq(teamAssignments.tenantId, tenantId)
        ));

      if (assignedSales.length > 0) {
        return new Response(JSON.stringify({ 
          error: "Cannot demote JL with assigned team members. Please reassign or remove team members first." 
        }), { status: 400 });
      }

      // Update user role back to sales
      await db
        .update(users)
        .set({ role: "sales" })
        .where(eq(users.id, targetUser.id));

      // Remove any existing team assignments where this user was a JL
      await db
        .update(teamAssignments)
        .set({ 
          status: "inactive",
          deactivatedAt: new Date()
        })
        .where(and(
          eq(teamAssignments.jlId, targetUser.id),
          eq(teamAssignments.tenantId, tenantId)
        ));

      return new Response(JSON.stringify({ success: true, message: "User demoted to sales successfully" }), { status: 200 });

    } else if (action === "assign_to_jl") {
      // Only team leaders can assign sales to JL
      if (currentUser.role !== "teamleader") {
        return new Response(JSON.stringify({ error: "Only team leaders can assign users" }), { status: 403 });
      }

      if (!jlId) {
        return new Response(JSON.stringify({ error: "JL ID is required for assignment" }), { status: 400 });
      }

      if (targetUser.role !== "sales") {
        return new Response(JSON.stringify({ error: "Only sales persons can be assigned to JL" }), { status: 400 });
      }

      // Verify JL exists by code
      const jlResult = await db
        .select({
          id: users.id,
          code: users.code,
          name: users.name,
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(and(
          eq(users.code, jlId),
          eq(users.role, "jl"),
          eq(users.tenantId, tenantId)
        ))
        .limit(1);

      const jl = jlResult[0];
      if (!jl) {
        return new Response(JSON.stringify({ error: "JL not found" }), { status: 404 });
      }

      // Deactivate any existing assignments for this salesperson
      await db
        .update(teamAssignments)
        .set({ 
          status: "inactive",
          deactivatedAt: new Date()
        })
        .where(and(
          eq(teamAssignments.salespersonId, targetUser.id),
          eq(teamAssignments.tenantId, tenantId)
        ));

      // Create new assignment
      await db
        .insert(teamAssignments)
        .values({
          salespersonId: targetUser.id,
          jlId: jl.id,
          status: "active",
          assignedBy: currentUser.id,
          tenantId: tenantId,
        });

      return new Response(JSON.stringify({ success: true, message: "User assigned to JL successfully" }), { status: 200 });

    } else if (action === "unassign_from_jl") {
      // Only team leaders can unassign users
      if (currentUser.role !== "teamleader") {
        return new Response(JSON.stringify({ error: "Only team leaders can unassign users" }), { status: 403 });
      }

      if (targetUser.role !== "sales") {
        return new Response(JSON.stringify({ error: "Only sales persons can be unassigned" }), { status: 400 });
      }

      // Check if user is currently assigned to a JL
      const currentAssignment = await db
        .select()
        .from(teamAssignments)
        .where(and(
          eq(teamAssignments.salespersonId, targetUser.id),
          eq(teamAssignments.status, "active"),
          eq(teamAssignments.tenantId, tenantId)
        ))
        .limit(1);

      if (currentAssignment.length === 0) {
        return new Response(JSON.stringify({ error: "User is not currently assigned to any JL" }), { status: 400 });
      }

      // Deactivate the current assignment
      await db
        .update(teamAssignments)
        .set({ 
          status: "inactive",
          deactivatedAt: new Date()
        })
        .where(and(
          eq(teamAssignments.salespersonId, targetUser.id),
          eq(teamAssignments.status, "active"),
          eq(teamAssignments.tenantId, tenantId)
        ));

      return new Response(JSON.stringify({ success: true, message: "User unassigned successfully" }), { status: 200 });

    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
    }

  } catch (error) {
    console.error("Team management error:", error);
    return new Response(JSON.stringify({ error: "Failed to perform team action" }), { status: 500 });
  }
}
