import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { users, tenants } from '@/db/schema';
import { eq, and, or, ne } from 'drizzle-orm';
import { getTenantContextFromRequest } from '@/lib/mongoTenant';
import { authenticateRequest, createUnauthorizedResponse } from '@/lib/clerkAuth';
import { requireTenantIdFromRequest } from '@/lib/tenant';
import { clerkClient } from '@clerk/nextjs/server';
import { getClerkOrganizationBySlug, getTenantIdFromOrgSlug } from '@/lib/clerkOrganization';

// Get all users (for team leader)
export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return createUnauthorizedResponse(authResult.error, authResult.statusCode);
  }

  const { tenantSubdomain, tenantId } = await getTenantContextFromRequest(request);
  
  let allUsers;
  if (tenantId) {
    allUsers = await db
      .select()
      .from(users)
      .where(eq(users.tenantId, tenantId));
  } else {
    allUsers = await db.select().from(users);
  }
  
  // Remove passwords from response
  const usersWithoutPasswords = allUsers.map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
  
  return NextResponse.json(usersWithoutPasswords);
}

// Create new user (for team leader)
export async function POST(request: NextRequest) {
  try {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
      console.error('Authentication failed:', authResult.error);
    return createUnauthorizedResponse(authResult.error, authResult.statusCode);
  }

  const data = await request.json();
  
  console.log('Creating user with data:', data);
    console.log('Clerk auth result:', { 
      email: authResult.email, 
      orgId: authResult.orgId, 
      orgSlug: authResult.orgSlug,
      userId: authResult.userId,
      appRole: authResult.appRole,
      isAdmin: authResult.isAdmin,
    });
    
    // Validate required fields
    if (!data.email || !data.name) {
      console.error('Missing required fields:', { email: !!data.email, name: !!data.name });
      return NextResponse.json({ 
        success: false, 
        error: 'Email and name are required' 
      }, { status: 400 });
    }

    // Get tenantId from Clerk organization (primary method)
    let tenantId: number | null = null;
    let tenantSubdomain: string | null = null;

    if (authResult.orgSlug && authResult.orgId) {
      // Use Clerk organization slug to find or create tenant
      tenantId = await getTenantIdFromOrgSlug(
        authResult.orgSlug,
        authResult.orgId,
        undefined // orgName not available here, will use slug as name
      );
      tenantSubdomain = authResult.orgSlug;
      console.log('Got tenantId from Clerk organization:', { orgSlug: authResult.orgSlug, orgId: authResult.orgId, tenantId });
    }

    // Fallback: If tenantId not found from org, try to get it from the current user's record
    if (!tenantId && authResult.email) {
      try {
        const currentUserResult = await db
          .select({ tenantId: users.tenantId })
          .from(users)
          .where(eq(users.email, authResult.email))
          .limit(1);
        
        if (currentUserResult.length > 0 && currentUserResult[0].tenantId) {
          tenantId = currentUserResult[0].tenantId;
          console.log('Got tenantId from current user record:', tenantId);
        }
      } catch (error) {
        console.error('Error fetching current user tenantId:', error);
      }
    }

    // Fallback: Try subdomain header as last resort
    if (!tenantId) {
      const { tenantId: subdomainTenantId, tenantSubdomain: subdomain } = await getTenantContextFromRequest(request);
      if (subdomainTenantId) {
        tenantId = subdomainTenantId;
        tenantSubdomain = subdomain;
        console.log('Got tenantId from subdomain header:', { tenantSubdomain: subdomain, tenantId });
      }
    }

    // Require tenantId - users must belong to a tenant
    if (!tenantId) {
      console.error('TenantId is missing. OrgSlug:', authResult.orgSlug, 'OrgId:', authResult.orgId, 'Current user email:', authResult.email);
      return NextResponse.json({ 
        success: false, 
        error: 'Tenant context required. You must be a member of a Clerk organization to add team members.' 
      }, { status: 400 });
    }
  
  // Force code to equal email for new users
  if (typeof data.email === 'string' && data.email.trim().length > 0) {
    data.code = data.email;
  }

  // Set default role if not provided (default to 'sales')
  if (!data.role || data.role.trim() === '') {
    data.role = 'sales';
  }

  // Check if email already exists globally (email has unique constraint across all tenants)
  const existingEmailUser = await db
    .select()
    .from(users)
    .where(eq(users.email, data.email || ''))
    .limit(1);
  
  if (existingEmailUser.length > 0) {
    console.log('User with email already exists globally:', existingEmailUser[0]);
    return NextResponse.json({ 
      success: false, 
      error: `User with email "${data.email}" already exists. Email must be unique across all organizations.` 
    }, { status: 400 });
  }

  // Check if code already exists in this tenant (code must be unique within tenant)
  if (data.code) {
    const existingCodeUser = await db
      .select()
      .from(users)
      .where(and(
        eq(users.tenantId, tenantId),
        eq(users.code, data.code)
      ))
      .limit(1);
    
    if (existingCodeUser.length > 0) {
      console.log('User with code already exists in tenant:', existingCodeUser[0]);
      return NextResponse.json({ 
        success: false, 
        error: `User with code "${data.code}" already exists in your organization` 
      }, { status: 400 });
    }
  }
  
  // Get Clerk organization ID - use from auth result (most reliable)
  let organizationId: string | null = authResult.orgId || null;
  
  console.log('🔍 Organization ID resolution:', {
    fromAuth: authResult.orgId,
    tenantSubdomain: tenantSubdomain,
    orgSlug: authResult.orgSlug,
    hasOrgId: !!organizationId,
  });
  
  // Fallback: If not in auth result, try to get it from tenant subdomain
  if (!organizationId && tenantSubdomain) {
    console.log('🔍 Attempting to lookup organization by tenant subdomain:', tenantSubdomain);
    organizationId = await getClerkOrganizationBySlug(tenantSubdomain);
    console.log('Organization lookup by slug (fallback):', { tenantSubdomain, organizationId });
  }
  
  // Final fallback: If we have orgSlug but no orgId, try to get orgId from slug
  if (!organizationId && authResult.orgSlug) {
    console.log('🔍 Attempting to lookup organization by auth orgSlug:', authResult.orgSlug);
    organizationId = await getClerkOrganizationBySlug(authResult.orgSlug);
    console.log('Organization lookup by auth orgSlug:', { orgSlug: authResult.orgSlug, organizationId });
  }
  
  if (!organizationId) {
    console.error('❌ CRITICAL: No Clerk organization ID available. Cannot add user to organization.');
    console.error('Auth result:', { 
      orgId: authResult.orgId, 
      orgSlug: authResult.orgSlug, 
      email: authResult.email,
      userId: authResult.userId,
    });
    console.error('Tenant context:', { tenantSubdomain, tenantId });
    // Don't return error yet - we'll create the user in DB but warn about org membership
  } else {
    console.log('✅ Using Clerk organization ID:', organizationId);
  }

  // Use Clerk's invitation system instead of directly creating users
  // This sends an email invitation and adds user to organization when they accept
  let invitationResult: any = null;
  let clerkUserId: string | null = null;
  let existingClerkUser: any = null;

  if (!organizationId) {
    console.error('❌ Cannot send invitation: No organization ID available');
    return NextResponse.json({ 
      success: false, 
      error: 'Organization not found. Please ensure you are part of a Clerk organization.' 
    }, { status: 400 });
  }

  if (!authResult.userId) {
    console.error('❌ Cannot send invitation: No authenticated user ID');
    return NextResponse.json({ 
      success: false, 
      error: 'Authentication required to send invitations' 
    }, { status: 401 });
  }

  try {
    const clerk = await clerkClient();
    
    // Check if user already exists in Clerk
    try {
      const userList = await clerk.users.getUserList({
        emailAddress: [data.email],
      });
      if (userList.data && userList.data.length > 0) {
        existingClerkUser = userList.data[0];
        clerkUserId = existingClerkUser.id;
        console.log(`ℹ️ Clerk user already exists with ID: ${clerkUserId}`);
        
        // Check if user is already a member of the organization
        const memberships = await clerk.organizations.getOrganizationMembershipList({
          organizationId: organizationId,
        });
        const isMember = memberships.data?.some(
          (m: any) => m.publicUserData?.userId === clerkUserId
        );
        
        if (isMember) {
          console.log('User is already a member of the organization');
        } else {
          // User exists but not in org - send invitation
          const userRole = data.role || 'sales';
          const clerkRole = userRole === 'teamleader' ? 'Admin' : 'org:salesexecutive';
          console.log('User exists but not in organization, sending invitation...', { userRole, clerkRole });
          
          // Determine redirect URL
          const orgSubdomain = authResult.orgSlug || tenantSubdomain || 'default';
          
          // Construct redirect URL based on current request host
          const host = request.headers.get('host') || request.headers.get('x-forwarded-host') || 'localhost:3000';
          const isLocalhost = host.includes('localhost');
          const protocol = isLocalhost ? 'http' : 'https';
          
          // Extract port with colon prefix for localhost
          let portPart = '';
          if (isLocalhost) {
            if (host.includes(':')) {
              const port = host.split(':')[1];
              portPart = `:${port}`;
            } else {
              portPart = ':3000';
            }
          }
          
          const redirectUrl = isLocalhost
            ? `${protocol}://${orgSubdomain}.localhost${portPart}/accept-invitation`
            : `${protocol}://${orgSubdomain}.wydex.co/accept-invitation`;
          
          const invitationPayload: any = {
            organizationId: organizationId,
            emailAddress: data.email,
            inviterUserId: authResult.userId,
            role: clerkRole, // Use 'Admin' for teamleader, 'org:salesexecutive' for sales (all lowercase)
            redirectUrl: redirectUrl, // Redirect to accept-invitation page after accepting invitation
          };
          
          invitationResult = await clerk.organizations.createOrganizationInvitation(invitationPayload);
          console.log('✅ Invitation sent to existing user:', invitationResult.id);
        }
      }
    } catch (lookupError: any) {
      console.log(`User lookup error (user likely doesn't exist):`, lookupError?.message);
    }

    // If user doesn't exist or wasn't already in org, send invitation
    if (!invitationResult && !existingClerkUser) {
      // Ensure role is set (default to 'sales')
      const userRole = data.role || 'sales';
      
      console.log('📧 Sending organization invitation to:', data.email);
      console.log('Invitation details:', {
        organizationId: organizationId,
        inviterUserId: authResult.userId,
        email: data.email,
        appRole: userRole,
      });
      
      // Determine the Clerk role - teamleader maps to Admin, sales maps to org:salesexecutive (all lowercase)
      // User has two roles in Clerk: "Admin" and "salesExecutive" (stored as "org:salesexecutive" in Clerk)
      const clerkRole = userRole === 'teamleader' ? 'Admin' : 'org:salesexecutive';
      
      console.log('Role mapping:', { appRole: userRole, clerkRole });
      
      try {
        // Determine redirect URL based on role - sales users go to dashboard
        // Use the organization's subdomain for proper tenant routing
        const orgSubdomain = authResult.orgSlug || tenantSubdomain || 'default';
        
        // Construct redirect URL based on current request host
        // This ensures it works for both localhost and production
        const host = request.headers.get('host') || request.headers.get('x-forwarded-host') || 'localhost:3000';
        const isLocalhost = host.includes('localhost');
        const protocol = isLocalhost ? 'http' : 'https';
        
        // Extract port with colon prefix for localhost
        let portPart = '';
        if (isLocalhost) {
          if (host.includes(':')) {
            const port = host.split(':')[1];
            portPart = `:${port}`;
          } else {
            portPart = ':3000';
          }
        }
        
        // Build redirect URL - but Clerk will handle the invitation flow first
        // When user clicks invitation link, Clerk automatically:
        // 1. Shows signup form with email pre-filled (for new users) OR signin form (for existing users)
        // 2. User sets password and authenticates
        // 3. User is added to organization
        // 4. Then redirects to redirectUrl
        const redirectUrl = isLocalhost
          ? `${protocol}://${orgSubdomain}.localhost${portPart}/accept-invitation`
          : `${protocol}://${orgSubdomain}.wydex.co/accept-invitation`;
        
        // Build invitation payload with role and redirect URL
        // The emailAddress here ensures Clerk pre-fills the email in signup form
        const invitationPayload: any = {
          organizationId: organizationId,
          emailAddress: data.email, // This pre-fills the email in the signup form
          inviterUserId: authResult.userId,
          role: clerkRole, // Use 'Admin' for teamleader, 'org:salesexecutive' for sales (all lowercase)
          redirectUrl: redirectUrl, // Redirect after invitation is accepted and user is authenticated
        };
        
        console.log('Invitation payload:', {
          emailAddress: data.email,
          organizationId: organizationId,
          role: clerkRole,
          redirectUrl: redirectUrl,
        });
        
        console.log('Creating invitation with role and redirect:', {
          role: clerkRole,
          redirectUrl: redirectUrl,
          orgSubdomain: orgSubdomain,
        });
        invitationResult = await clerk.organizations.createOrganizationInvitation(invitationPayload);
        
        console.log(`✅ Organization invitation created successfully:`, {
          invitationId: invitationResult.id,
          email: data.email,
          role: clerkRole,
          organizationId: organizationId,
          status: invitationResult.status,
          publicMetadata: invitationResult.publicMetadata,
        });
        
        // Verify invitation was created by checking invitation list
        try {
          const invitations = await clerk.organizations.getOrganizationInvitationList({
            organizationId: organizationId,
          });
          
          const sentInvitation = invitations.data?.find(
            (inv: any) => inv.id === invitationResult.id
          );
          
          if (sentInvitation) {
            console.log('✅ Invitation verified in organization:', {
              id: sentInvitation.id,
              emailAddress: sentInvitation.emailAddress,
              status: sentInvitation.status,
              createdAt: sentInvitation.createdAt,
            });
          } else {
            console.warn('⚠️ Invitation created but not found in organization list');
          }
        } catch (verifyError: any) {
          console.warn('⚠️ Could not verify invitation:', verifyError?.message);
        }
      } catch (inviteCreateError: any) {
        console.error('❌ Failed to create invitation with role:', clerkRole);
        console.error('Error details:', {
          message: inviteCreateError.message,
          status: inviteCreateError.status,
          errors: inviteCreateError.errors,
          clerkTraceId: inviteCreateError.clerkTraceId,
        });
        
        // If role not found, try alternative formats as fallback
        if (inviteCreateError.status === 404 && inviteCreateError.errors?.[0]?.code === 'resource_not_found') {
          let fallbackRole: string | null = null;
          
          // Try alternative role formats
          if (clerkRole === 'Admin') {
            // Try 'org:admin' (default Clerk admin role) as fallback
            fallbackRole = 'org:admin';
          } else if (clerkRole === 'org:salesexecutive') {
            // Try 'salesExecutive' (without org: prefix) or 'org:salesExecutive' (with capital E) as fallback
            fallbackRole = 'salesExecutive';
          }
          
          if (fallbackRole) {
            console.log(`⚠️ Role "${clerkRole}" not found, trying fallback: "${fallbackRole}"...`);
            try {
              const fallbackPayload = {
                organizationId: organizationId,
                emailAddress: data.email,
                inviterUserId: authResult.userId,
                role: fallbackRole,
              };
              invitationResult = await clerk.organizations.createOrganizationInvitation(fallbackPayload);
              console.log(`✅ Invitation created successfully with fallback role "${fallbackRole}"`);
            } catch (fallbackError: any) {
              console.error('❌ Fallback also failed:', {
                message: fallbackError?.message,
                status: fallbackError?.status,
                errors: fallbackError?.errors,
              });
              throw inviteCreateError; // Throw original error
            }
          } else {
            throw inviteCreateError; // Re-throw if no fallback available
          }
        } else {
          throw inviteCreateError; // Re-throw to be caught by outer catch
        }
      }
    }
    
  } catch (inviteError: any) {
    console.error('❌ Error sending organization invitation:', inviteError);
    console.error('Error details:', {
      message: inviteError.message,
      status: inviteError.status,
      statusText: inviteError.statusText,
      errors: inviteError.errors,
      clerkTraceId: inviteError.clerkTraceId,
    });
    
    if (inviteError.errors && Array.isArray(inviteError.errors)) {
      console.error('Clerk invitation errors:', JSON.stringify(inviteError.errors, null, 2));
    }
    
    // Don't fail completely - we can still create the user in DB
    // They can be manually added to the organization later
    console.warn('⚠️ Invitation failed, but will still create user in database');
  }
  
  // Create user in database (password not needed - they'll set it when accepting invitation)
  const userData = {
    email: data.email,
    password: '', // No password needed - user will set it when accepting Clerk invitation
    code: data.code || data.email,
    name: data.name,
    role: data.role || 'sales',
    target: data.target || 0,
    tenantId: tenantId, // tenantId is guaranteed to be non-null at this point
  };
  
  console.log('Final user data to insert:', userData);
  
  try {
  const [newUser] = await db
    .insert(users)
    .values(userData)
    .returning({ id: users.id });
  
    console.log('User created with ID:', newUser.id, 'Clerk User ID:', clerkUserId);
    
    // Check if invitation was sent successfully
    let invitationStatus = 'pending';
    if (invitationResult) {
      invitationStatus = 'sent';
      console.log('✅ Invitation was sent successfully');
    } else if (existingClerkUser) {
      // User already exists and might already be in org
      invitationStatus = 'existing_user';
      console.log('ℹ️ User already exists in Clerk');
    } else {
      console.warn('⚠️ No invitation was sent');
    }
    
    const responseMessage = invitationResult 
      ? `Team member invited successfully! Invitation ID: ${invitationResult.id}. An email invitation has been sent to ${data.email}. If they don't receive it, check: 1) Spam/Junk folder, 2) Clerk Dashboard > Email Settings, 3) Organization invitations list.`
      : existingClerkUser
      ? `User already exists in Clerk (ID: ${clerkUserId}). If they weren't already in the organization, an invitation should have been sent. Check Clerk Dashboard for pending invitations.`
      : `User created in database but invitation was not sent. Please check the logs or manually add them to the organization in Clerk Dashboard.`;
    
    return NextResponse.json({ 
      success: true,
      message: responseMessage,
      clerkUserId: clerkUserId || null,
      organizationId: organizationId,
      invitationId: invitationResult?.id || null,
      invitationStatus: invitationStatus,
      invitationEmail: data.email,
      invitationDetails: invitationResult ? {
        id: invitationResult.id,
        status: invitationResult.status,
        emailAddress: invitationResult.emailAddress,
        createdAt: invitationResult.createdAt,
      } : null,
      troubleshooting: invitationResult ? {
        note: "If email was not received, check:",
        steps: [
          "1. Check spam/junk folder",
          "2. Verify Clerk email service is configured in Clerk Dashboard",
          "3. Check Organization > Invitations in Clerk Dashboard",
          "4. Verify email address is correct",
          "5. Check Clerk email delivery logs in Dashboard"
        ]
      } : null,
    });
  } catch (dbError: any) {
    console.error('Database error inserting user:', dbError);
    
    // Check for specific database constraint violations
    const errorMessage = dbError?.message || 'Unknown database error';
    
    if (errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
      if (errorMessage.includes('email')) {
        return NextResponse.json({ 
          success: false, 
          error: `User with email "${data.email}" already exists. Email must be unique.` 
        }, { status: 400 });
      } else if (errorMessage.includes('code') || errorMessage.includes('tenant_code')) {
        return NextResponse.json({ 
          success: false, 
          error: `User with code "${data.code}" already exists in your organization.` 
        }, { status: 400 });
      }
      return NextResponse.json({ 
        success: false, 
        error: 'A user with this email or code already exists.' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: `Database error: ${errorMessage}` 
    }, { status: 500 });
  }
  } catch (error: any) {
    console.error('Error in POST /api/users:', error);
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Failed to create user' 
    }, { status: 500 });
  }
}

// Update user (for team leader)
export async function PUT(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return createUnauthorizedResponse(authResult.error, authResult.statusCode);
  }

  const { id, ...updateData } = await request.json();
  const { tenantId } = await getTenantContextFromRequest(request);
  
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing user ID' }, { status: 400 });
  }
  
  // Remove fields that shouldn't be updated
  delete updateData.id;
  const updatePayload = {
    ...updateData,
    updatedAt: new Date()
  };
  
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ success: false, error: 'Invalid user ID' }, { status: 400 });
  }
  
  let updateResult;
  if (tenantId) {
    updateResult = await db
      .update(users)
      .set(updatePayload)
      .where(and(
        eq(users.id, userId),
        eq(users.tenantId, tenantId)
      ))
      .returning({ id: users.id });
  } else {
    updateResult = await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, userId))
      .returning({ id: users.id });
  }
  
  if (updateResult.length > 0) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ success: false, error: 'User not found or not updated' }, { status: 404 });
  }
}

// Delete user (for team leader)
export async function DELETE(request: NextRequest) {
  try {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return createUnauthorizedResponse(authResult.error, authResult.statusCode);
  }

  const { searchParams } = new URL(request.url);
    const idOrCode = searchParams.get('id');
    
    if (!idOrCode) {
      return NextResponse.json({ success: false, error: 'Missing user ID or code' }, { status: 400 });
    }

    // Get tenantId from Clerk organization (primary method)
    let tenantId: number | null = null;
    let tenantSubdomain: string | null = null;
    
    if (authResult.orgSlug && authResult.orgId) {
      tenantId = await getTenantIdFromOrgSlug(
        authResult.orgSlug,
        authResult.orgId,
        authResult.orgSlug
      );
      tenantSubdomain = authResult.orgSlug;
      console.log('Got tenantId from Clerk organization for delete:', { orgSlug: authResult.orgSlug, tenantId });
    }

    // Fallback: Get tenantId from current user's record
    if (!tenantId && authResult.email) {
      try {
        const currentUserResult = await db
          .select({ tenantId: users.tenantId })
          .from(users)
          .where(eq(users.email, authResult.email))
          .limit(1);
        
        if (currentUserResult.length > 0 && currentUserResult[0].tenantId) {
          tenantId = currentUserResult[0].tenantId;
          console.log('Got tenantId from current user record for delete:', tenantId);
        }
      } catch (error) {
        console.error('Error fetching current user tenantId for delete:', error);
      }
    }

    // Final fallback: Try subdomain header
    if (!tenantId) {
      const { tenantId: subdomainTenantId } = await getTenantContextFromRequest(request);
      if (subdomainTenantId) {
        tenantId = subdomainTenantId;
        console.log('Got tenantId from subdomain header for delete:', tenantId);
      }
    }

    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'Tenant context required to delete user.' }, { status: 400 });
    }

    // Check if idOrCode is a number (ID) or string (code)
    const userId = parseInt(idOrCode, 10);
    const isNumericId = !isNaN(userId);

    let userToDelete;
    
    // First, find the user by ID or code within the tenant
    if (isNumericId) {
      // Search by numeric ID
      const userResult = await db
        .select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.id, userId),
          eq(users.tenantId, tenantId)
        ))
        .limit(1);
      
      userToDelete = userResult[0];
    } else {
      // Search by code (which can be email or user code)
      const userResult = await db
        .select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.code, idOrCode),
          eq(users.tenantId, tenantId)
        ))
        .limit(1);
      
      if (userResult.length === 0) {
        // If not found by code, try email
        const userByEmail = await db
          .select({ id: users.id })
          .from(users)
          .where(and(
            eq(users.email, idOrCode),
            eq(users.tenantId, tenantId)
          ))
          .limit(1);
        
        userToDelete = userByEmail[0];
      } else {
        userToDelete = userResult[0];
      }
    }

    if (!userToDelete) {
      console.error('User not found for deletion:', { idOrCode, tenantId, isNumericId });
      return NextResponse.json({ success: false, error: 'User not found in your organization' }, { status: 404 });
    }

    // Delete the user
    const deleteResult = await db
      .delete(users)
      .where(and(
        eq(users.id, userToDelete.id),
        eq(users.tenantId, tenantId)
      ))
      .returning({ id: users.id, email: users.email });
  
  if (deleteResult.length > 0) {
      console.log('User deleted successfully:', { userId: userToDelete.id, email: deleteResult[0].email });
      
      // Optionally: Also remove from Clerk organization (if they're a member)
      // This is optional - you might want to keep them in Clerk but just remove from database
      // Uncomment below if you want to remove from Clerk org too:
      /*
      if (authResult.orgId) {
        try {
          const clerk = await clerkClient();
          // Find Clerk user by email
          const clerkUsers = await clerk.users.getUserList({
            emailAddress: [deleteResult[0].email],
          });
          if (clerkUsers.data && clerkUsers.data.length > 0) {
            const clerkUser = clerkUsers.data[0];
            await clerk.organizations.deleteOrganizationMembership({
              organizationId: authResult.orgId,
              userId: clerkUser.id,
            });
            console.log('User also removed from Clerk organization');
          }
        } catch (clerkError) {
          console.warn('Could not remove user from Clerk organization:', clerkError);
          // Don't fail the delete if Clerk removal fails
        }
      }
      */
      
      return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } else {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete user' }, { status: 500 });
  }
}
