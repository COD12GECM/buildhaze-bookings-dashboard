import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getDashboardDB } from '@/lib/db';
import { verifyPassword, generateAccessToken, setAuthCookie, hashEmail } from '@/lib/auth';
import { UserRole } from '@/types';

// Demo credentials for preview (remove in production)
const DEMO_USER = {
  email: 'demo@buildhaze.com',
  password: 'demo123',
  id: 'demo-user-id',
  businessId: 'demo-business-id',
  name: 'Demo Admin',
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
};

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Demo mode - allow login without database
    if (email === DEMO_USER.email && password === DEMO_USER.password) {
      const token = generateAccessToken({
        userId: DEMO_USER.id,
        businessId: DEMO_USER.businessId,
        email: DEMO_USER.email,
        role: DEMO_USER.role,
        permissions: DEMO_USER.permissions,
      });

      await setAuthCookie(token);

      return NextResponse.json({
        success: true,
        user: {
          id: DEMO_USER.id,
          email: DEMO_USER.email,
          name: DEMO_USER.name,
          role: DEMO_USER.role,
          must_change_password: false,
        },
      });
    }

    // Try database login
    try {
      await connectDB();
      const db = getDashboardDB();

      const emailHash = hashEmail(email);
      const user = await db.collection('users').findOne({
        email_hash: emailHash,
        is_deleted: false,
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      if (!user.is_active) {
        return NextResponse.json(
          { success: false, error: 'Account is disabled.' },
          { status: 403 }
        );
      }

      const isValid = await verifyPassword(password, user.password_hash);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { last_login: new Date() } }
      );

      const token = generateAccessToken({
        userId: user._id.toString(),
        businessId: user.business_id.toString(),
        email: user.email,
        role: user.role as UserRole,
        permissions: user.permissions,
      });

      await setAuthCookie(token);

      return NextResponse.json({
        success: true,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          must_change_password: user.must_change_password,
        },
      });
    } catch (dbError) {
      // If database fails, only allow demo login
      console.error('Database error:', dbError);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password. Try demo@buildhaze.com / demo123' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
