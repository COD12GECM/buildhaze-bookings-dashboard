import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getDashboardDB } from '@/lib/db';
import { generateAccessToken, setAuthCookie } from '@/lib/auth';
import { UserRole } from '@/types';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';

const JWT_SUPER_ADMIN_SECRET = process.env.JWT_SECRET + '_super_admin';

// Verify super admin token
async function verifySuperAdmin() {
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

// POST /api/super-admin/ghost-login/[businessId] - Ghost login into a business
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const superAdmin = await verifySuperAdmin();
  if (!superAdmin) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  if (!superAdmin.permissions.can_ghost_login) {
    return NextResponse.json(
      { success: false, error: 'Permission denied' },
      { status: 403 }
    );
  }

  try {
    const { businessId } = await params;

    if (!ObjectId.isValid(businessId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid business ID' },
        { status: 400 }
      );
    }

    await connectDB();
    const db = getDashboardDB();

    // Find the business
    const business = await db.collection('businesses').findOne({
      _id: new ObjectId(businessId),
      is_deleted: { $ne: true },
    });

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      );
    }

    // Find the admin user for this business
    const adminUser = await db.collection('users').findOne({
      business_id: new ObjectId(businessId),
      role: 'ADMIN',
      is_deleted: { $ne: true },
    });

    // Generate ghost token (as if we're the admin)
    const ghostToken = generateAccessToken({
      userId: adminUser ? adminUser._id.toString() : `ghost_${businessId}`,
      businessId: businessId,
      email: business.email || 'ghost@buildhaze.com',
      role: UserRole.ADMIN,
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
      isGhostLogin: true,
      ghostedBy: superAdmin.userId,
    });

    // Set the auth cookie for dashboard access
    await setAuthCookie(ghostToken);

    // Log audit
    await db.collection('audit_logs').insertOne({
      business_id: new ObjectId(businessId),
      event_type: 'GHOST_LOGIN',
      entity_type: 'BUSINESS',
      entity_id: new ObjectId(businessId),
      previous_state: null,
      new_state: { ghosted_as: adminUser?._id?.toString() || 'no_admin' },
      performed_by: superAdmin.userId,
      performed_by_type: 'SUPER_ADMIN',
      metadata: {
        super_admin_email: superAdmin.email,
        business_name: business.name,
      },
      created_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: {
        business_id: businessId,
        business_name: business.name,
        redirect_url: '/dashboard',
      },
    });
  } catch (error) {
    console.error('Ghost login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
