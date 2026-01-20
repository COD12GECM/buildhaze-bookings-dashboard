import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getDashboardDB } from '@/lib/db';
import { hashEmail, encrypt } from '@/lib/auth';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { sendAdminInvitation } from '@/lib/brevo';

const JWT_SUPER_ADMIN_SECRET = process.env.JWT_SECRET + '_super_admin';

// Verify super admin token
async function verifySuperAdmin(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('super_admin_token')?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_SUPER_ADMIN_SECRET) as {
      type: string;
      userId: string;
      email: string;
      name: string;
      permissions: Record<string, boolean>;
    };

    if (payload.type !== 'super_admin') {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// GET /api/super-admin/businesses - List all businesses
export async function GET(request: NextRequest) {
  const superAdmin = await verifySuperAdmin(request);
  if (!superAdmin) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    await connectDB();
    const db = getDashboardDB();

    const businesses = await db
      .collection('businesses')
      .find({ is_deleted: { $ne: true } })
      .sort({ created_at: -1 })
      .toArray();

    // Get user counts for each business
    const businessesWithStats = await Promise.all(
      businesses.map(async (business) => {
        const userCount = await db.collection('users').countDocuments({
          business_id: business._id,
          is_deleted: { $ne: true },
        });

        const bookingCount = await db.collection('bookings').countDocuments({
          business_id: business._id,
          is_deleted: { $ne: true },
        });

        return {
          id: business._id.toString(),
          name: business.name,
          email: business.email,
          phone: business.phone,
          timezone: business.timezone,
          is_active: business.is_active,
          created_at: business.created_at,
          stats: {
            users: userCount,
            bookings: bookingCount,
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: businessesWithStats,
    });
  } catch (error) {
    console.error('List businesses error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/super-admin/businesses - Create business and send admin invitation
export async function POST(request: NextRequest) {
  const superAdmin = await verifySuperAdmin(request);
  if (!superAdmin) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  if (!superAdmin.permissions.can_create_businesses) {
    return NextResponse.json(
      { success: false, error: 'Permission denied' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      businessName,
      adminEmail,
      adminName,
      phone,
      address,
      timezone = 'Europe/Bucharest',
    } = body;

    if (!businessName || !adminEmail || !adminName) {
      return NextResponse.json(
        { success: false, error: 'Business name, admin email, and admin name are required' },
        { status: 400 }
      );
    }

    await connectDB();
    const db = getDashboardDB();

    // Check if business email already exists
    const emailHash = hashEmail(adminEmail);
    const existingBusiness = await db.collection('businesses').findOne({
      email_hash: emailHash,
      is_deleted: { $ne: true },
    });

    if (existingBusiness) {
      return NextResponse.json(
        { success: false, error: 'A business with this email already exists' },
        { status: 400 }
      );
    }

    // Check if there's already a pending invitation
    const existingInvitation = await db.collection('invitations').findOne({
      email_hash: emailHash,
      type: 'ADMIN',
      status: 'PENDING',
      expires_at: { $gt: new Date() },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { success: false, error: 'An invitation is already pending for this email' },
        { status: 400 }
      );
    }

    // Create business
    const encryptedEmail = encrypt(adminEmail);
    const encryptedPhone = phone ? encrypt(phone) : undefined;
    const phoneHash = phone ? hashEmail(phone) : undefined;

    const businessResult = await db.collection('businesses').insertOne({
      name: businessName,
      email: encryptedEmail,
      email_hash: emailHash,
      phone: encryptedPhone,
      phone_hash: phoneHash,
      address: address || '',
      timezone,
      settings: {
        slots_per_hour: 1,
        default_buffer_before: 0,
        default_buffer_after: 15,
        max_advance_booking_days: 30,
        min_lead_time_hours: 2,
        rooms_available: 1,
        working_hours: {
          monday: { enabled: true, start: '09:00', end: '17:00' },
          tuesday: { enabled: true, start: '09:00', end: '17:00' },
          wednesday: { enabled: true, start: '09:00', end: '17:00' },
          thursday: { enabled: true, start: '09:00', end: '17:00' },
          friday: { enabled: true, start: '09:00', end: '17:00' },
          saturday: { enabled: false, start: '09:00', end: '13:00' },
          sunday: { enabled: false, start: '09:00', end: '13:00' },
        },
      },
      is_active: true,
      is_deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: superAdmin.userId,
    });

    const businessId = businessResult.insertedId;

    // Generate unique invitation code
    const inviteCode = crypto.randomBytes(16).toString('hex');

    // Create invitation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    await db.collection('invitations').insertOne({
      business_id: businessId,
      type: 'ADMIN',
      email: encryptedEmail,
      email_hash: emailHash,
      code: inviteCode,
      name: adminName,
      role_config: {
        permissions: {
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
        },
      },
      invited_by: superAdmin.userId,
      invited_by_type: 'SUPER_ADMIN',
      status: 'PENDING',
      expires_at: expiresAt,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Send invitation email via Brevo
    const emailResult = await sendAdminInvitation({
      email: adminEmail,
      name: adminName,
      inviteCode,
      inviterName: superAdmin.name,
    });

    if (emailResult.error) {
      console.error('Failed to send invitation email:', emailResult.error);
      // Don't fail the request, just log the error
    }

    // Log audit
    await db.collection('audit_logs').insertOne({
      event_type: 'BUSINESS_CREATED',
      entity_type: 'BUSINESS',
      entity_id: businessId,
      previous_state: null,
      new_state: { name: businessName, admin_email: adminEmail },
      performed_by: superAdmin.userId,
      performed_by_type: 'SUPER_ADMIN',
      metadata: { invitation_code: inviteCode },
      created_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: {
        business_id: businessId.toString(),
        invitation_code: inviteCode,
        email_sent: !emailResult.error,
      },
    });
  } catch (error) {
    console.error('Create business error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
