import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * API endpoint to sync Clerk user to database
 * Creates a user in the database with teamleader role if they don't exist
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await auth();
    const { userId } = authResult;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json(
        { success: false, error: "Clerk user not found" },
        { status: 404 }
      );
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    const firstName = clerkUser.firstName || "";
    const lastName = clerkUser.lastName || "";
    const name = `${firstName} ${lastName}`.trim() || email?.split("@")[0] || "User";

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email not found in Clerk user" },
        { status: 400 }
      );
    }

    // Check if user already exists in database
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      // User already exists, return success
      return NextResponse.json({
        success: true,
        user: existingUser[0],
        message: "User already exists",
      });
    }

    // Create new user with teamleader role
    const [newUser] = await db
      .insert(users)
      .values({
        email: email,
        code: email, // Use email as code
        name: name,
        role: "teamleader",
        password: "", // No password needed for Clerk users
        target: 0,
        tenantId: null, // Will be set later if needed
      })
      .returning();

    console.log("Created new teamleader user from Clerk:", {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    });

    return NextResponse.json({
      success: true,
      user: newUser,
      message: "User created successfully with teamleader role",
    });
  } catch (error: any) {
    console.error("Error syncing Clerk user to database:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to sync user",
      },
      { status: 500 }
    );
  }
}


