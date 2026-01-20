import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getDashboardDB } from '@/lib/db';
import { verifyToken, decrypt } from '@/lib/auth';
import { UserRole } from '@/types';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';

// GET /api/team - List all team members
export async function GET(request: NextRequest) {
  try {
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

    // Only Admin can view full team list
    if (payload.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();
    const db = getDashboardDB();

    const businessId = new ObjectId(payload.businessId);

    // Get all team members
    const users = await db
      .collection('users')
      .find({
        business_id: businessId,
        is_deleted: { $ne: true },
      })
      .sort({ created_at: -1 })
      .toArray();

    // Get pending invitations
    const pendingInvitations = await db
      .collection('invitations')
      .find({
        business_id: businessId,
        status: 'PENDING',
        expires_at: { $gt: new Date() },
      })
      .sort({ created_at: -1 })
      .toArray();

    // Get services for mapping
    const services = await db
      .collection('services')
      .find({
        business_id: businessId,
        is_deleted: { $ne: true },
      })
      .toArray();

    const serviceMap = new Map(services.map((s) => [s._id.toString(), s.name]));

    // Format users
    const formattedUsers = users.map((user) => {
      let email = user.email;
      try {
        email = decrypt(user.email);
      } catch {
        // Email might not be encrypted in demo mode
      }

      return {
        id: user._id.toString(),
        name: user.name,
        email,
        role: user.role,
        permissions: user.permissions,
        services: (user.service_ids || []).map((id: ObjectId) => ({
          id: id.toString(),
          name: serviceMap.get(id.toString()) || 'Unknown',
        })),
        color: user.color,
        is_active: user.is_active,
        last_login: user.last_login,
        created_at: user.created_at,
      };
    });

    // Format pending invitations
    const formattedInvitations = pendingInvitations.map((inv) => {
      let email = inv.email;
      try {
        email = decrypt(inv.email);
      } catch {
        // Email might not be encrypted
      }

      return {
        id: inv._id.toString(),
        name: inv.name,
        email,
        role: inv.type,
        status: 'PENDING',
        expires_at: inv.expires_at,
        created_at: inv.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        members: formattedUsers,
        pending_invitations: formattedInvitations,
      },
    });
  } catch (error) {
    console.error('List team error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
