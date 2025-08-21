import { NextRequest } from "next/server";
import { getMongoDb } from "@/lib/mongoClient";
import { getTenantContextFromRequest } from "@/lib/mongoTenant";

interface TeamAssignment {
  salespersonId: string;
  jlId: string;
  status: string;
  tenantSubdomain?: string;
}

interface User {
  _id: string;
  code: string;
  name: string;
  email: string;
  role: string;
  tenantSubdomain?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    
    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID is required" }), { status: 400 });
    }

    console.log("Team management request for userId:", userId);

    const db = await getMongoDb();
    const users = db.collection("users");
    
    // Get tenant context using the same method as /api/users
    const { tenantSubdomain } = await getTenantContextFromRequest(request);
    console.log("Tenant subdomain from context:", tenantSubdomain);
    
    const filter = tenantSubdomain ? { tenantSubdomain } : {};

    // Debug: Check what users exist
    const allUsersInDb = await users.find(filter).toArray();
    console.log("All users in database:", allUsersInDb.map((u: any) => ({ 
      email: u.email, 
      role: u.role, 
      tenantSubdomain: u.tenantSubdomain,
      code: u.code,
      name: u.name
    })));
    
    // Debug: Check users with specific roles
    const salesUsers = await users.find({ ...filter, role: "sales" }).toArray();
    console.log("Users with 'sales' role:", salesUsers.length, salesUsers.map((u: any) => ({ email: u.email, code: u.code })));
    
    const jlUsers = await users.find({ ...filter, role: "jl" }).toArray();
    console.log("Users with 'jl' role:", jlUsers.length, jlUsers.map((u: any) => ({ email: u.email, code: u.code })));
    
    const tlUsers = await users.find({ ...filter, role: "teamleader" }).toArray();
    console.log("Users with 'teamleader' role:", tlUsers.length, tlUsers.map((u: any) => ({ email: u.email, code: u.code })));
    
    // Debug: Check users without role field
    const usersWithoutRole = await users.find({ ...filter, role: { $exists: false } }).toArray();
    console.log("Users without role field:", usersWithoutRole.length, usersWithoutRole.map((u: any) => ({ email: u.email, code: u.code })));
    
    // Debug: Check all possible role values
    const allRoles = await users.distinct("role", filter);
    console.log("All unique role values in database:", allRoles);

    // Find current user using the same approach as /api/users
    const currentUser = await users.findOne({ 
      email: userId,
      ...filter
    }) as User | null;
    
    console.log("User lookup result:", currentUser ? "Found" : "Not found");

    if (!currentUser) {
      console.log("User not found in database:", userId);
      return new Response(JSON.stringify({ 
        error: "User not found",
        debug: {
          searchedUserId: userId,
          tenantSubdomain: tenantSubdomain,
          allUsers: allUsersInDb.map((u: any) => ({ email: u.email, role: u.role })),
          searchQuery: { email: userId, ...filter }
        }
      }), { status: 404 });
    }

    console.log("Found user:", currentUser.name, "Role:", currentUser.role);

    // Get all users for this tenant using the same approach as /api/users
    const allUsers = await users.find({
      ...filter,
      role: { $in: ["teamleader", "jl", "sales"] }
    }).toArray() as User[];

    console.log("Found users with filtered roles:", allUsers.length);
    console.log("Users found:", allUsers.map((u: any) => ({ email: u.email, role: u.role, code: u.code })));

    // Get team assignments for this tenant
    let teamAssignments: TeamAssignment[] = [];
    try {
      const assignmentFilter = tenantSubdomain ? { tenantSubdomain, status: "active" } : { status: "active" };
      teamAssignments = await db.collection("teamAssignments").find(assignmentFilter).toArray() as TeamAssignment[];
    } catch (error) {
      console.log("No teamAssignments collection found, using empty array");
      teamAssignments = [];
    }

    console.log("Found team assignments:", teamAssignments.length);

    // Create a map of salesperson to JL assignments
    const salesToJlMap = new Map<string, string>();
    teamAssignments.forEach((assignment: TeamAssignment) => {
      salesToJlMap.set(assignment.salespersonId, assignment.jlId);
    });

    // Create a map of JL to salesperson assignments
    const jlToSalesMap = new Map<string, string[]>();
    teamAssignments.forEach((assignment: TeamAssignment) => {
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
          code: user.code,
          name: user.name,
          email: user.email,
          role: user.role,
          assignedTo: user.role === "sales" ? salesToJlMap.get(user.code) : null
        })),
        juniorLeaders: allUsers.filter((user: User) => user.role === "jl").map((jl: User) => ({
          ...jl,
          teamMembers: jlToSalesMap.get(jl.code) || []
        })),
        salesPersons: allUsers.filter((user: User) => user.role === "sales").map((sales: User) => ({
          ...sales,
          assignedTo: salesToJlMap.get(sales.code)
        }))
      };
    } else if (currentUser.role === "jl") {
      // Junior Leader sees only their assigned team
      const assignedSales = jlToSalesMap.get(currentUser.code) || [];
      teamData = {
        allUsers: allUsers.filter((user: User) => 
          user.code === currentUser.code || assignedSales.includes(user.code)
        ),
        juniorLeaders: [currentUser],
        salesPersons: allUsers.filter((user: User) => 
          user.role === "sales" && assignedSales.includes(user.code)
        ).map((sales: User) => ({
          ...sales,
          assignedTo: currentUser.code
        }))
      };
    } else {
      // Sales person sees only themselves
      teamData = {
        allUsers: [currentUser],
        juniorLeaders: [],
        salesPersons: [currentUser]
      };
    }

    console.log("Returning team data for role:", currentUser.role);
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

    const db = await getMongoDb();
    const users = db.collection("users");
    const teamAssignments = db.collection("teamAssignments");

    // Get tenant context using the same method as /api/users
    const { tenantSubdomain } = await getTenantContextFromRequest(request);
    const filter = tenantSubdomain ? { tenantSubdomain } : {};

    // Get current user
    const currentUser = await users.findOne({ 
      email: userId,
      ...filter
    }) as User | null;

    if (!currentUser) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    // Get target user
    const targetUser = await users.findOne({ 
      code: targetUserId,
      ...filter
    }) as User | null;

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
      await users.updateOne(
        { code: targetUserId, ...filter },
        { $set: { role: "jl" } }
      );

      // Remove any existing team assignments for this user
      const assignmentFilter = tenantSubdomain ? { tenantSubdomain } : {};
      await teamAssignments.updateMany(
        { 
          salespersonId: targetUserId,
          ...assignmentFilter
        },
        { $set: { status: "inactive", deactivatedAt: new Date() } }
      );

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
      const assignedSales = await teamAssignments.find({
        jlId: targetUserId,
        status: "active",
        ...(tenantSubdomain ? { tenantSubdomain } : {})
      }).toArray();

      if (assignedSales.length > 0) {
        return new Response(JSON.stringify({ 
          error: "Cannot demote JL with assigned team members. Please reassign or remove team members first." 
        }), { status: 400 });
      }

      // Update user role back to sales
      await users.updateOne(
        { code: targetUserId, ...filter },
        { $set: { role: "sales" } }
      );

      // Remove any existing team assignments where this user was a JL
      const assignmentFilter = tenantSubdomain ? { tenantSubdomain } : {};
      await teamAssignments.updateMany(
        { 
          jlId: targetUserId,
          ...assignmentFilter
        },
        { $set: { status: "inactive", deactivatedAt: new Date() } }
      );

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

      // Verify JL exists
      const jl = await users.findOne({ 
        code: jlId,
        role: "jl",
        ...filter
      }) as User | null;

      if (!jl) {
        return new Response(JSON.stringify({ error: "JL not found" }), { status: 404 });
      }

      // Deactivate any existing assignments for this salesperson
      const assignmentFilter = tenantSubdomain ? { tenantSubdomain } : {};
      await teamAssignments.updateMany(
        { 
          salespersonId: targetUserId,
          ...assignmentFilter
        },
        { $set: { status: "inactive", deactivatedAt: new Date() } }
      );

      // Create new assignment
      await teamAssignments.insertOne({
        salespersonId: targetUserId,
        jlId: jlId,
        assignedBy: currentUser.code,
        status: "active",
        assignedAt: new Date(),
        ...(tenantSubdomain ? { tenantSubdomain } : {}),
        createdAt: new Date(),
        updatedAt: new Date()
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
      const currentAssignment = await teamAssignments.findOne({
        salespersonId: targetUserId,
        status: "active",
        ...(tenantSubdomain ? { tenantSubdomain } : {})
      });

      if (!currentAssignment) {
        return new Response(JSON.stringify({ error: "User is not currently assigned to any JL" }), { status: 400 });
      }

      // Deactivate the current assignment
      const assignmentFilter = tenantSubdomain ? { tenantSubdomain } : {};
      await teamAssignments.updateMany(
        { 
          salespersonId: targetUserId,
          status: "active",
          ...assignmentFilter
        },
        { $set: { status: "inactive", deactivatedAt: new Date() } }
      );

      return new Response(JSON.stringify({ success: true, message: "User unassigned successfully" }), { status: 200 });

    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
    }

  } catch (error) {
    console.error("Team management error:", error);
    return new Response(JSON.stringify({ error: "Failed to perform team action" }), { status: 500 });
  }
} 