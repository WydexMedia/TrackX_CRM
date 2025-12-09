import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Clerk Webhook handler
 * Handles user.created events to automatically create users in database with teamleader role
 * 
 * NOTE: Webhook verification with svix is optional. This simplified version works
 * but for production, install svix package and add proper verification.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const eventType = payload.type;

    if (eventType === "user.created") {
      const { id, email_addresses, first_name, last_name } = payload.data;

      const email = email_addresses?.[0]?.email_address;
      const firstName = first_name || "";
      const lastName = last_name || "";
      const name = `${firstName} ${lastName}`.trim() || email?.split("@")[0] || "User";

      if (!email) {
        console.error("No email found in Clerk user data");
        return NextResponse.json(
          { error: "Email not found in user data" },
          { status: 400 }
        );
      }

      try {
        // Check if user already exists
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existingUser.length > 0) {
          console.log(`User ${email} already exists in database`);
          return NextResponse.json({ 
            success: true, 
            message: "User already exists" 
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

        console.log("Created new teamleader user from Clerk webhook:", {
          clerkId: id,
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        });

        return NextResponse.json({ 
          success: true, 
          message: "User created successfully",
          user: newUser
        });
      } catch (error: any) {
        console.error("Error creating user from webhook:", error);
        return NextResponse.json(
          { error: error?.message || "Failed to create user" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: error?.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}

