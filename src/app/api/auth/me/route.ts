import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { UserRole } from '@/types';

// Demo user for preview mode
const DEMO_USER = {
  id: 'demo-user-id',
  businessId: 'demo-business-id',
  email: 'demo@buildhaze.com',
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

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
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

    // If demo user, return demo data
    if (payload.userId === 'demo-user-id') {
      return NextResponse.json({
        success: true,
        user: DEMO_USER,
      });
    }

    // For real users, return from token payload
    return NextResponse.json({
      success: true,
      user: {
        id: payload.userId,
        businessId: payload.businessId,
        email: payload.email,
        name: payload.email.split('@')[0],
        role: payload.role,
        permissions: payload.permissions,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
