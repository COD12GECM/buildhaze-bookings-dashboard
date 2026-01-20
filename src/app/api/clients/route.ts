import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getDashboardDB } from '@/lib/db';
import { verifyToken, decrypt } from '@/lib/auth';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';

// GET /api/clients - List all clients
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const tag = searchParams.get('tag') || '';

    // Build query
    const query: Record<string, unknown> = {
      business_id: businessId,
      is_deleted: { $ne: true },
    };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (tag) {
      query.behavioral_tags = tag;
    }

    // Get total count
    const totalCount = await db.collection('clients').countDocuments(query);

    // Get clients with pagination
    const clients = await db
      .collection('clients')
      .find(query)
      .sort({ 'meta_stats.last_visit': -1, created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const formattedClients = clients.map((client) => {
      // Decrypt primary email if exists
      let email = '';
      const primaryEmail = client.identifiers?.find(
        (id: { type: string; is_primary: boolean }) => id.type === 'email' && id.is_primary
      );
      if (primaryEmail?.value) {
        try {
          email = decrypt(primaryEmail.value);
        } catch {
          email = '[encrypted]';
        }
      }

      // Decrypt primary phone if exists
      let phone = '';
      const primaryPhone = client.identifiers?.find(
        (id: { type: string }) => id.type === 'phone'
      );
      if (primaryPhone?.value) {
        try {
          phone = decrypt(primaryPhone.value);
        } catch {
          phone = '[encrypted]';
        }
      }

      return {
        id: client._id.toString(),
        name: client.name,
        email,
        phone,
        meta_stats: client.meta_stats || {
          total_bookings: 0,
          completed_bookings: 0,
          cancelled_bookings: 0,
          no_shows: 0,
          total_spent: 0,
        },
        behavioral_tags: client.behavioral_tags || [],
        notes_count: client.notes?.length || 0,
        first_visit: client.meta_stats?.first_visit,
        last_visit: client.meta_stats?.last_visit,
        created_at: client.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        clients: formattedClients,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    console.error('List clients error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
