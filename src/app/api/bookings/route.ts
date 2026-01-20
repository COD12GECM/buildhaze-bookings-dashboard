import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getBookingDB } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { checkAvailability } from '@/lib/availability-engine';
import { BookingStatus, UserRole } from '@/types';

// GET /api/bookings - Get all bookings (with filters)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const providerId = searchParams.get('providerId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    await connectDB();
    const bookingDb = getBookingDB();

    // Build query based on role
    const query: Record<string, unknown> = {
      status: { $nin: ['cancelled'] },
    };

    // Provider can only see own bookings
    if (user.role === UserRole.PROVIDER) {
      query.teamMemberId = user.id;
    } else if (providerId) {
      query.teamMemberId = providerId;
    }

    if (date) {
      query.date = date;
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      bookingDb.collection('bookings')
        .find(query)
        .sort({ date: -1, time: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      bookingDb.collection('bookings').countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: bookings,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + bookings.length < total,
      },
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/bookings - Create a new booking
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    if (!user.permissions.can_create_bookings && user.role !== UserRole.ADMIN) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      date,
      time,
      service,
      serviceDuration = 60,
      clientName,
      clientEmail,
      clientPhone,
      providerId,
      providerName,
      notes,
      clinicEmail,
      clinicName,
    } = body;

    // Validate required fields
    if (!date || !time || !clientName || !clientEmail) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Provider can only create bookings for themselves
    if (user.role === UserRole.PROVIDER && providerId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Providers can only create bookings for themselves' },
        { status: 403 }
      );
    }

    // Check availability
    const availabilityResult = await checkAvailability({
      clinicEmail: clinicEmail || user.email,
      date,
      time,
      providerId,
      duration: serviceDuration,
    });

    if (!availabilityResult.available) {
      return NextResponse.json({
        success: false,
        error: availabilityResult.details || 'Time slot not available',
        reason: availabilityResult.reason,
      }, { status: 409 });
    }

    await connectDB();
    const bookingDb = getBookingDB();

    // Generate booking ID
    const bookingId = Date.now();

    // Create booking (compatible with booking-api format)
    const booking = {
      id: bookingId,
      date,
      time,
      service: service || 'Consultation',
      name: clientName,
      email: clientEmail.toLowerCase().trim(),
      phone: clientPhone || '',
      notes: notes || '',
      status: BookingStatus.CONFIRMED,
      teamMemberId: providerId || '',
      teamMemberName: providerName || '',
      clinicEmail: (clinicEmail || '').toLowerCase().trim(),
      clinicName: clinicName || '',
      cancelToken: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      source: 'dashboard',
      lead_source: user.role === UserRole.PROVIDER ? 'provider_self' : 'manual_staff',
      created_by: user.id,
      version: 1,
      service_snapshot: {
        name: service || 'Consultation',
        duration: serviceDuration,
        price: 0,
        buffer_before: 0,
        buffer_after: 15,
      },
    };

    await bookingDb.collection('bookings').insertOne(booking);

    return NextResponse.json({
      success: true,
      data: booking,
      message: 'Booking created successfully',
    });
  } catch (error) {
    console.error('Create booking error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
