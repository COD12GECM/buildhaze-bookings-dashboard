import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getDashboardDB } from '@/lib/db';
import { hashPassword, generateAccessToken, setAuthCookie } from '@/lib/auth';
import { UserRole } from '@/types';

// GET /api/auth/accept-invite/[code] - Get invitation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    await connectDB();
    const db = getDashboardDB();

    const invitation = await db.collection('invitations').findOne({
      code,
      status: 'PENDING',
    });

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired invitation' },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date() > new Date(invitation.expires_at)) {
      await db.collection('invitations').updateOne(
        { _id: invitation._id },
        { $set: { status: 'EXPIRED', updated_at: new Date() } }
      );
      return NextResponse.json(
        { success: false, error: 'This invitation has expired' },
        { status: 410 }
      );
    }

    // Get business name if applicable
    let businessName = null;
    if (invitation.business_id) {
      const business = await db.collection('businesses').findOne({
        _id: invitation.business_id,
      });
      businessName = business?.name;
    }

    return NextResponse.json({
      success: true,
      data: {
        name: invitation.name,
        type: invitation.type,
        businessName,
      },
    });
  } catch (error) {
    console.error('Get invitation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/auth/accept-invite/[code] - Accept invitation and create account
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { password } = await request.json();

    if (!password || password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    await connectDB();
    const db = getDashboardDB();

    const invitation = await db.collection('invitations').findOne({
      code,
      status: 'PENDING',
    });

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired invitation' },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date() > new Date(invitation.expires_at)) {
      await db.collection('invitations').updateOne(
        { _id: invitation._id },
        { $set: { status: 'EXPIRED', updated_at: new Date() } }
      );
      return NextResponse.json(
        { success: false, error: 'This invitation has expired' },
        { status: 410 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Determine role
    let role: UserRole;
    switch (invitation.type) {
      case 'ADMIN':
        role = UserRole.ADMIN;
        break;
      case 'STAFF':
        role = UserRole.STAFF;
        break;
      case 'PROVIDER':
        role = UserRole.PROVIDER;
        break;
      default:
        role = UserRole.STAFF;
    }

    // Get default permissions based on role or use invitation config
    const permissions = invitation.role_config?.permissions || getDefaultPermissions(role);

    // Create user
    const userResult = await db.collection('users').insertOne({
      business_id: invitation.business_id,
      email: invitation.email,
      email_hash: invitation.email_hash,
      password_hash: passwordHash,
      name: invitation.name,
      role,
      permissions,
      service_ids: invitation.role_config?.services || [],
      working_hours: invitation.role_config?.working_hours || null,
      booking_limits: invitation.role_config?.booking_limits || null,
      color: generateUserColor(),
      calendar_sync: {
        google: { connected: false },
        outlook: { connected: false },
        apple: { connected: false },
      },
      days_off: [],
      is_active: true,
      is_deleted: false,
      must_change_password: false,
      invitation_id: invitation._id,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const userId = userResult.insertedId;

    // Update invitation status
    await db.collection('invitations').updateOne(
      { _id: invitation._id },
      {
        $set: {
          status: 'ACCEPTED',
          accepted_at: new Date(),
          updated_at: new Date(),
        },
      }
    );

    // Log audit
    await db.collection('audit_logs').insertOne({
      business_id: invitation.business_id,
      event_type: 'USER_CREATED',
      entity_type: 'USER',
      entity_id: userId,
      previous_state: null,
      new_state: { name: invitation.name, role, email_hash: invitation.email_hash },
      performed_by: userId.toString(),
      performed_by_type: role.toUpperCase(),
      metadata: { invitation_id: invitation._id.toString() },
      created_at: new Date(),
    });

    // Generate token and set cookie
    const token = generateAccessToken({
      userId: userId.toString(),
      businessId: invitation.business_id?.toString() || '',
      email: invitation.email,
      role,
      permissions,
    });

    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      data: {
        user_id: userId.toString(),
        role,
        redirect_url: '/dashboard',
      },
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getDefaultPermissions(role: UserRole): Record<string, boolean> {
  switch (role) {
    case UserRole.ADMIN:
      return {
        can_view_all_bookings: true,
        can_create_bookings: true,
        can_modify_bookings: true,
        can_cancel_bookings: true,
        can_manage_services: true,
        can_manage_team: true,
        can_view_analytics: true,
        can_export_data: true,
        can_edit_templates: true,
        can_drag_drop_calendar: true,
      };
    case UserRole.STAFF:
      return {
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
      };
    case UserRole.PROVIDER:
      return {
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
    default:
      return {
        can_view_all_bookings: false,
        can_create_bookings: false,
        can_modify_bookings: false,
        can_cancel_bookings: false,
        can_manage_services: false,
        can_manage_team: false,
        can_view_analytics: false,
        can_export_data: false,
        can_edit_templates: false,
        can_drag_drop_calendar: false,
      };
  }
}

function generateUserColor(): string {
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
