import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getDashboardDB } from '@/lib/db';
import { verifyToken, hashEmail, encrypt } from '@/lib/auth';
import { UserRole } from '@/types';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { sendTeamInvitation } from '@/lib/brevo';
import { ObjectId } from 'mongodb';

// POST /api/team/invite - Invite a new team member (Staff or Provider)
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Only Admin can invite team members
    if (payload.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Only admins can invite team members' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      email,
      name,
      role, // 'STAFF' or 'PROVIDER'
      services = [], // Service IDs for providers
      permissions = {},
      workingHours = null,
      bookingLimits = null,
    } = body;

    // Validate required fields
    if (!email || !name || !role) {
      return NextResponse.json(
        { success: false, error: 'Email, name, and role are required' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['STAFF', 'PROVIDER'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Role must be STAFF or PROVIDER' },
        { status: 400 }
      );
    }

    await connectDB();
    const db = getDashboardDB();

    const businessId = new ObjectId(payload.businessId);
    const emailHash = hashEmail(email);

    // Check if user already exists in this business
    const existingUser = await db.collection('users').findOne({
      business_id: businessId,
      email_hash: emailHash,
      is_deleted: { $ne: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists in your team' },
        { status: 400 }
      );
    }

    // Check for pending invitation
    const existingInvitation = await db.collection('invitations').findOne({
      business_id: businessId,
      email_hash: emailHash,
      status: 'PENDING',
      expires_at: { $gt: new Date() },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { success: false, error: 'An invitation is already pending for this email' },
        { status: 400 }
      );
    }

    // Get business info for email
    const business = await db.collection('businesses').findOne({
      _id: businessId,
    });

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      );
    }

    // Get inviter info
    let inviterName = 'Admin';
    if (payload.userId !== 'demo-user-id') {
      const inviter = await db.collection('users').findOne({
        _id: new ObjectId(payload.userId),
      });
      if (inviter) {
        inviterName = inviter.name;
      }
    }

    // Generate unique invitation code
    const inviteCode = crypto.randomBytes(16).toString('hex');

    // Set expiration (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Determine default permissions based on role
    const defaultPermissions = role === 'STAFF' 
      ? {
          can_view_all_bookings: true,
          can_create_bookings: true,
          can_modify_bookings: true,
          can_cancel_bookings: true,
          can_manage_services: false,
          can_manage_team: false,
          can_view_analytics: false,
          can_export_data: false,
          can_edit_templates: false,
          can_drag_drop_calendar: false,
        }
      : {
          can_view_all_bookings: false,
          can_create_bookings: true,
          can_modify_bookings: false,
          can_cancel_bookings: false,
          can_manage_services: false,
          can_manage_team: false,
          can_view_analytics: false,
          can_export_data: false,
          can_edit_templates: false,
          can_drag_drop_calendar: false,
        };

    // Merge with custom permissions
    const finalPermissions = { ...defaultPermissions, ...permissions };

    // Encrypt email
    const encryptedEmail = encrypt(email);

    // Create invitation
    const invitationResult = await db.collection('invitations').insertOne({
      business_id: businessId,
      type: role,
      email: encryptedEmail,
      email_hash: emailHash,
      code: inviteCode,
      name,
      role_config: {
        services: services.map((id: string) => new ObjectId(id)),
        permissions: finalPermissions,
        working_hours: workingHours,
        booking_limits: bookingLimits,
      },
      invited_by: payload.userId,
      invited_by_type: 'ADMIN',
      status: 'PENDING',
      expires_at: expiresAt,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Send invitation email via Brevo
    const emailResult = await sendTeamInvitation({
      email,
      name,
      inviteCode,
      inviterName,
      businessName: business.name,
      role: role as 'STAFF' | 'PROVIDER',
    });

    if (emailResult.error) {
      console.error('Failed to send invitation email:', emailResult.error);
    }

    // Log audit
    await db.collection('audit_logs').insertOne({
      business_id: businessId,
      event_type: 'TEAM_INVITE_SENT',
      entity_type: 'INVITATION',
      entity_id: invitationResult.insertedId,
      previous_state: null,
      new_state: { email_hash: emailHash, role, name },
      performed_by: payload.userId,
      performed_by_type: 'ADMIN',
      metadata: { invitation_code: inviteCode },
      created_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: {
        invitation_id: invitationResult.insertedId.toString(),
        invitation_code: inviteCode,
        email_sent: !emailResult.error,
        expires_at: expiresAt,
      },
    });
  } catch (error) {
    console.error('Team invite error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
