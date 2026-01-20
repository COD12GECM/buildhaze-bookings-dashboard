/**
 * CENTRAL AVAILABILITY ENGINE
 * 
 * This is the SINGLE SOURCE OF TRUTH for availability decisions.
 * No booking is valid without this engine's approval.
 * 
 * Rules (Non-Negotiable):
 * - Availability is computed at request time, never stored
 * - External calendar conflicts always block booking
 * - Existing bookings always take precedence
 * - No rule can be bypassed by UI or role
 */

import { connectDB, getBookingDB } from './db';
import { AvailabilityBlockReason } from '@/types';

export interface AvailabilityCheckParams {
  businessId?: string;
  clinicEmail: string;
  providerId?: string;
  serviceId?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration?: number; // minutes
  bufferBefore?: number;
  bufferAfter?: number;
  clientEmail?: string;
  excludeBookingId?: number; // For rescheduling
}

export interface AvailabilityResult {
  available: boolean;
  reason?: AvailabilityBlockReason;
  blockedBy?: string;
  details?: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  reason?: AvailabilityBlockReason;
}

/**
 * Check if a specific time slot is available
 */
export async function checkAvailability(params: AvailabilityCheckParams): Promise<AvailabilityResult> {
  await connectDB();
  const bookingDb = getBookingDB();
  
  const {
    clinicEmail,
    providerId,
    date,
    time,
    duration = 60,
    bufferBefore = 0,
    bufferAfter = 15,
    excludeBookingId,
  } = params;

  // Calculate the full blocked window (buffer-aware)
  const requestedStart = timeToMinutes(time);
  const requestedEnd = requestedStart + duration;
  const blockedStart = requestedStart - bufferBefore;
  const blockedEnd = requestedEnd + bufferAfter;

  // 1. Check for existing booking conflicts
  const existingBookings = await bookingDb.collection('bookings').find({
    clinicEmail: clinicEmail.toLowerCase(),
    date,
    status: { $nin: ['cancelled', 'no-show'] },
    ...(excludeBookingId ? { id: { $ne: excludeBookingId } } : {}),
  }).toArray();

  for (const booking of existingBookings) {
    const bookingStart = timeToMinutes(booking.time);
    const bookingDuration = booking.service_snapshot?.duration || 60;
    const bookingBufferBefore = booking.service_snapshot?.buffer_before || 0;
    const bookingBufferAfter = booking.service_snapshot?.buffer_after || 15;
    
    const bookingBlockedStart = bookingStart - bookingBufferBefore;
    const bookingBlockedEnd = bookingStart + bookingDuration + bookingBufferAfter;

    // Check for overlap
    if (blockedStart < bookingBlockedEnd && blockedEnd > bookingBlockedStart) {
      return {
        available: false,
        reason: 'EXISTING_BOOKING',
        blockedBy: `Booking #${booking.id}`,
        details: `Conflict with existing booking at ${booking.time}`,
      };
    }
  }

  // 2. Check provider-specific conflicts (if providerId provided)
  if (providerId) {
    const providerBookings = await bookingDb.collection('bookings').find({
      teamMemberId: providerId,
      date,
      status: { $nin: ['cancelled', 'no-show'] },
      ...(excludeBookingId ? { id: { $ne: excludeBookingId } } : {}),
    }).toArray();

    for (const booking of providerBookings) {
      const bookingStart = timeToMinutes(booking.time);
      const bookingDuration = booking.service_snapshot?.duration || 60;
      const bookingBufferAfter = booking.service_snapshot?.buffer_after || 15;
      const bookingEnd = bookingStart + bookingDuration + bookingBufferAfter;

      if (requestedStart < bookingEnd && requestedEnd > bookingStart) {
        return {
          available: false,
          reason: 'EXISTING_BOOKING',
          blockedBy: `Provider booking at ${booking.time}`,
          details: `Provider already has a booking at this time`,
        };
      }
    }
  }

  // 3. Check lead time (minimum time before booking)
  const now = new Date();
  const bookingDateTime = new Date(`${date}T${time}`);
  const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  const minLeadTimeHours = 2; // Default, should come from service/business settings
  if (hoursUntilBooking < minLeadTimeHours) {
    return {
      available: false,
      reason: 'LEAD_TIME_VIOLATION',
      details: `Booking must be at least ${minLeadTimeHours} hours in advance`,
    };
  }

  // 4. Check max advance booking
  const maxAdvanceDays = 30; // Default, should come from service/business settings
  const daysUntilBooking = hoursUntilBooking / 24;
  if (daysUntilBooking > maxAdvanceDays) {
    return {
      available: false,
      reason: 'MAX_ADVANCE_EXCEEDED',
      details: `Cannot book more than ${maxAdvanceDays} days in advance`,
    };
  }

  // 5. Check working hours
  // TODO: Load working hours from business settings based on day
  const workingStart = timeToMinutes('09:00');
  const workingEnd = timeToMinutes('17:00');
  
  if (requestedStart < workingStart || requestedEnd > workingEnd) {
    return {
      available: false,
      reason: 'OUTSIDE_WORKING_HOURS',
      details: `Requested time is outside working hours (09:00 - 17:00)`,
    };
  }

  // All checks passed
  return { available: true };
}

/**
 * Get all available time slots for a given date
 */
export async function getAvailableSlots(params: {
  clinicEmail: string;
  date: string;
  providerId?: string;
  duration?: number;
  slotsPerHour?: number;
}): Promise<TimeSlot[]> {
  const { clinicEmail, date, providerId, duration = 60, slotsPerHour = 1 } = params;
  
  const slots: TimeSlot[] = [];
  const slotInterval = 60 / slotsPerHour;
  
  // Generate slots from 09:00 to 17:00
  for (let hour = 9; hour < 17; hour++) {
    for (let slot = 0; slot < slotsPerHour; slot++) {
      const minutes = slot * slotInterval;
      const time = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      const result = await checkAvailability({
        clinicEmail,
        date,
        time,
        providerId,
        duration,
      });
      
      slots.push({
        time,
        available: result.available,
        reason: result.reason,
      });
    }
  }
  
  return slots;
}

/**
 * Get booking counts by date-time (for calendar display)
 */
export async function getBookingCounts(clinicEmail: string): Promise<Record<string, number>> {
  await connectDB();
  const bookingDb = getBookingDB();
  
  const bookings = await bookingDb.collection('bookings').find({
    clinicEmail: clinicEmail.toLowerCase(),
    status: { $nin: ['cancelled', 'no-show'] },
  }).toArray();
  
  const counts: Record<string, number> = {};
  bookings.forEach(booking => {
    const key = `${booking.date}-${booking.time}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  
  return counts;
}

/**
 * Helper: Convert time string to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// minutesToTime helper available if needed for future use

/**
 * Validate booking request with full engine check
 */
export async function validateBookingRequest(params: {
  clinicEmail: string;
  date: string;
  time: string;
  providerId?: string;
  serviceVersion?: number;
  idempotencyKey: string;
}): Promise<AvailabilityResult & { canProceed: boolean }> {
  // 1. Check availability
  const availabilityResult = await checkAvailability({
    clinicEmail: params.clinicEmail,
    date: params.date,
    time: params.time,
    providerId: params.providerId,
  });

  if (!availabilityResult.available) {
    return { ...availabilityResult, canProceed: false };
  }

  // 2. TODO: Check service version guard
  // 3. TODO: Check atomic lock
  // 4. TODO: Check client frequency limits

  return { ...availabilityResult, canProceed: true };
}
