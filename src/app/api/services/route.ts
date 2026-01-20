import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getDashboardDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { UserRole } from '@/types';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';

// GET /api/services - List all services
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

    await connectDB();
    const db = getDashboardDB();

    const businessId = new ObjectId(payload.businessId);

    // Get all services
    const services = await db
      .collection('services')
      .find({
        business_id: businessId,
        is_deleted: { $ne: true },
      })
      .sort({ created_at: -1 })
      .toArray();

    // Get providers for each service
    const users = await db
      .collection('users')
      .find({
        business_id: businessId,
        is_deleted: { $ne: true },
        role: 'PROVIDER',
      })
      .toArray();

    const userMap = new Map(users.map((u) => [u._id.toString(), u.name]));

    const formattedServices = services.map((service) => ({
      id: service._id.toString(),
      name: service.name,
      description: service.description,
      duration: service.duration,
      price: service.price,
      buffer_before: service.buffer_before || 0,
      buffer_after: service.buffer_after || 0,
      min_lead_time_hours: service.min_lead_time_hours || 0,
      max_advance_days: service.max_advance_days || 30,
      rooms_required: service.rooms_required || 1,
      is_enabled: service.is_enabled !== false,
      providers: (service.provider_ids || []).map((id: ObjectId) => ({
        id: id.toString(),
        name: userMap.get(id.toString()) || 'Unknown',
      })),
      version: service.version || 1,
      created_at: service.created_at,
      updated_at: service.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: formattedServices,
    });
  } catch (error) {
    console.error('List services error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/services - Create a new service
export async function POST(request: NextRequest) {
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

    // Only Admin can create services
    if (payload.role !== UserRole.ADMIN && !payload.permissions?.can_manage_services) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description = '',
      duration,
      price,
      buffer_before = 0,
      buffer_after = 0,
      min_lead_time_hours = 0,
      max_advance_days = 30,
      rooms_required = 1,
      provider_ids = [],
      available_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      available_hours = { start: '09:00', end: '17:00' },
    } = body;

    // Validate required fields
    if (!name || !duration || price === undefined) {
      return NextResponse.json(
        { success: false, error: 'Name, duration, and price are required' },
        { status: 400 }
      );
    }

    await connectDB();
    const db = getDashboardDB();

    const businessId = new ObjectId(payload.businessId);

    // Check for duplicate name
    const existingService = await db.collection('services').findOne({
      business_id: businessId,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      is_deleted: { $ne: true },
    });

    if (existingService) {
      return NextResponse.json(
        { success: false, error: 'A service with this name already exists' },
        { status: 400 }
      );
    }

    // Create service
    const serviceResult = await db.collection('services').insertOne({
      business_id: businessId,
      name,
      description,
      duration: Number(duration),
      price: Number(price),
      buffer_before: Number(buffer_before),
      buffer_after: Number(buffer_after),
      min_lead_time_hours: Number(min_lead_time_hours),
      max_advance_days: Number(max_advance_days),
      rooms_required: Number(rooms_required),
      provider_ids: provider_ids.map((id: string) => new ObjectId(id)),
      available_days,
      available_hours,
      frequency_limit: null,
      is_enabled: true,
      is_deleted: false,
      version: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Log audit
    await db.collection('audit_logs').insertOne({
      business_id: businessId,
      event_type: 'SERVICE_CREATED',
      entity_type: 'SERVICE',
      entity_id: serviceResult.insertedId,
      previous_state: null,
      new_state: { name, duration, price },
      performed_by: payload.userId,
      performed_by_type: payload.role.toUpperCase(),
      created_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: {
        id: serviceResult.insertedId.toString(),
      },
    });
  } catch (error) {
    console.error('Create service error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
