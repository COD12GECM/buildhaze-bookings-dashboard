import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getDashboardDB } from '@/lib/db';
import { verifyToken, decrypt } from '@/lib/auth';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';

// GET /api/clients/[id] - Get client details with booking history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const clientId = new ObjectId(id);

    // Get client
    const client = await db.collection('clients').findOne({
      _id: clientId,
      business_id: businessId,
      is_deleted: { $ne: true },
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    // Decrypt identifiers
    const identifiers = (client.identifiers || []).map((id: {
      type: string;
      value: string;
      is_primary?: boolean;
    }) => {
      let value = id.value;
      try {
        value = decrypt(id.value);
      } catch {
        value = '[encrypted]';
      }
      return {
        type: id.type,
        value,
        is_primary: id.is_primary,
      };
    });

    // Get booking history
    const bookings = await db
      .collection('bookings')
      .find({
        business_id: businessId,
        client_id: clientId,
        is_deleted: { $ne: true },
      })
      .sort({ date: -1, time: -1 })
      .limit(50)
      .toArray();

    // Get service and provider names
    const serviceIds = Array.from(new Set(bookings.map((b) => b.service_id).filter(Boolean)));
    const providerIds = Array.from(new Set(bookings.map((b) => b.provider_id).filter(Boolean)));

    const services = await db
      .collection('services')
      .find({ _id: { $in: serviceIds } })
      .toArray();

    const providers = await db
      .collection('users')
      .find({ _id: { $in: providerIds } })
      .toArray();

    const serviceMap = new Map(services.map((s) => [s._id.toString(), s.name]));
    const providerMap = new Map(providers.map((p) => [p._id.toString(), p.name]));

    const formattedBookings = bookings.map((booking) => ({
      id: booking._id.toString(),
      date: booking.date,
      time: booking.time,
      duration: booking.duration,
      service_name: serviceMap.get(booking.service_id?.toString()) || 'Unknown',
      provider_name: providerMap.get(booking.provider_id?.toString()) || 'Unknown',
      status: booking.status,
      price: booking.price,
      notes: booking.notes,
      created_at: booking.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: {
        id: client._id.toString(),
        name: client.name,
        identifiers,
        meta_stats: client.meta_stats || {
          total_bookings: 0,
          completed_bookings: 0,
          cancelled_bookings: 0,
          no_shows: 0,
          total_spent: 0,
        },
        behavioral_tags: client.behavioral_tags || [],
        notes: client.notes || [],
        bookings: formattedBookings,
        created_at: client.created_at,
        updated_at: client.updated_at,
      },
    });
  } catch (error) {
    console.error('Get client error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/clients/[id] - Update client (add note, tag, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const body = await request.json();
    const { action, note, tag } = body;

    await connectDB();
    const db = getDashboardDB();

    const businessId = new ObjectId(payload.businessId);
    const clientId = new ObjectId(id);

    // Verify client exists
    const client = await db.collection('clients').findOne({
      _id: clientId,
      business_id: businessId,
      is_deleted: { $ne: true },
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    const updateOps: Record<string, unknown> = {
      $set: { updated_at: new Date() },
    };

    if (action === 'add_note' && note) {
      updateOps.$push = {
        notes: {
          id: new ObjectId().toString(),
          content: note,
          created_by: payload.userId,
          created_at: new Date(),
        },
      };
    } else if (action === 'add_tag' && tag) {
      updateOps.$addToSet = { behavioral_tags: tag };
    } else if (action === 'remove_tag' && tag) {
      updateOps.$pull = { behavioral_tags: tag };
    }

    await db.collection('clients').updateOne({ _id: clientId }, updateOps);

    // Log audit
    await db.collection('audit_logs').insertOne({
      business_id: businessId,
      event_type: 'CLIENT_UPDATED',
      entity_type: 'CLIENT',
      entity_id: clientId,
      previous_state: null,
      new_state: { action, note: note ? '[note added]' : undefined, tag },
      performed_by: payload.userId,
      performed_by_type: payload.role.toUpperCase(),
      created_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Client updated successfully',
    });
  } catch (error) {
    console.error('Update client error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
