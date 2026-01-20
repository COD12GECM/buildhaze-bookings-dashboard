import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getBookingDB } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { BookingStatus, UserRole } from '@/types';

// GET /api/bookings/[id] - Get a single booking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const bookingId = parseInt(id);

    await connectDB();
    const bookingDb = getBookingDB();

    const booking = await bookingDb.collection('bookings').findOne({ id: bookingId });

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    // Provider can only see own bookings
    if (user.role === UserRole.PROVIDER && booking.teamMemberId !== user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: booking });
  } catch (error) {
    console.error('Get booking error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/bookings/[id] - Update a booking
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.permissions.can_modify_bookings && user.role !== UserRole.ADMIN) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const bookingId = parseInt(id);
    const body = await request.json();

    await connectDB();
    const bookingDb = getBookingDB();

    const booking = await bookingDb.collection('bookings').findOne({ id: bookingId });

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    // Check version for optimistic locking
    if (body.expectedVersion && booking.version !== body.expectedVersion) {
      return NextResponse.json({
        success: false,
        error: 'Booking was modified by another user. Please refresh and try again.',
        code: 'VERSION_CONFLICT',
      }, { status: 409 });
    }

    // Build update object
    const updateFields: Record<string, unknown> = {
      updated_at: new Date(),
      version: (booking.version || 1) + 1,
    };

    // Allowed fields to update
    const allowedFields = ['status', 'notes', 'date', 'time', 'teamMemberId', 'teamMemberName'];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields[field] = body[field];
      }
    }

    // Handle status change
    if (body.status) {
      if (body.status === BookingStatus.CANCELLED) {
        updateFields.cancelled_at = new Date();
        updateFields.cancelled_by = user.id;
        updateFields.cancellation_reason = body.cancellationReason || '';
      }
    }

    const result = await bookingDb.collection('bookings').updateOne(
      { id: bookingId },
      { $set: updateFields }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ success: false, error: 'Failed to update booking' }, { status: 500 });
    }

    const updatedBooking = await bookingDb.collection('bookings').findOne({ id: bookingId });

    return NextResponse.json({
      success: true,
      data: updatedBooking,
      message: 'Booking updated successfully',
    });
  } catch (error) {
    console.error('Update booking error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/bookings/[id] - Cancel a booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.permissions.can_cancel_bookings && user.role !== UserRole.ADMIN) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const bookingId = parseInt(id);

    await connectDB();
    const bookingDb = getBookingDB();

    const booking = await bookingDb.collection('bookings').findOne({ id: bookingId });

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    // Soft cancel (update status)
    await bookingDb.collection('bookings').updateOne(
      { id: bookingId },
      {
        $set: {
          status: BookingStatus.CANCELLED,
          cancelled_at: new Date(),
          cancelled_by: user.id,
          updated_at: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
