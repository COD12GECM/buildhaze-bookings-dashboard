import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getDashboardDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { UserRole } from '@/types';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';

// GET /api/audit-logs - List audit logs (Admin only)
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

    // Only Admin can view audit logs
    if (payload.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();
    const db = getDashboardDB();

    const businessId = new ObjectId(payload.businessId);

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const eventType = searchParams.get('event_type');
    const entityType = searchParams.get('entity_type');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Build query
    const query: Record<string, unknown> = {
      business_id: businessId,
    };

    if (eventType) {
      query.event_type = eventType;
    }

    if (entityType) {
      query.entity_type = entityType;
    }

    if (startDate || endDate) {
      query.created_at = {};
      if (startDate) {
        (query.created_at as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        (query.created_at as Record<string, Date>).$lte = new Date(endDate);
      }
    }

    // Get total count
    const totalCount = await db.collection('audit_logs').countDocuments(query);

    // Get logs with pagination
    const logs = await db
      .collection('audit_logs')
      .find(query)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Get user names for performed_by
    const userIds = logs
      .filter((log) => log.performed_by && ObjectId.isValid(log.performed_by))
      .map((log) => new ObjectId(log.performed_by));

    const users = await db
      .collection('users')
      .find({ _id: { $in: userIds } })
      .toArray();

    const userMap = new Map(users.map((u) => [u._id.toString(), u.name]));

    const formattedLogs = logs.map((log) => ({
      id: log._id.toString(),
      event_type: log.event_type,
      entity_type: log.entity_type,
      entity_id: log.entity_id?.toString(),
      previous_state: log.previous_state,
      new_state: log.new_state,
      performed_by: log.performed_by,
      performed_by_name: userMap.get(log.performed_by) || log.performed_by_type || 'System',
      performed_by_type: log.performed_by_type,
      metadata: log.metadata,
      created_at: log.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    console.error('List audit logs error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
