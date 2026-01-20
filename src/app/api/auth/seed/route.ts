import { NextResponse } from 'next/server';
import { connectDB, getDashboardDB } from '@/lib/db';
import { hashPassword, hashEmail } from '@/lib/auth';
import { UserRole } from '@/types';
import { getDefaultPermissions } from '@/models/User';

// POST /api/auth/seed - Create initial admin user (only works if no users exist)
export async function POST() {
  try {
    await connectDB();
    const db = getDashboardDB();

    // Check if any users exist
    const existingUsers = await db.collection('users').countDocuments();
    
    if (existingUsers > 0) {
      return NextResponse.json({
        success: false,
        error: 'Users already exist. Seed is only for initial setup.',
      }, { status: 400 });
    }

    // Create a business first
    const businessResult = await db.collection('businesses').insertOne({
      name: 'BuildHaze Demo',
      email: 'admin@buildhaze.com',
      phone: '+40 700 000 000',
      address: 'Bucharest, Romania',
      timezone: 'Europe/Bucharest',
      settings: {
        slots_per_hour: 1,
        default_buffer_before: 0,
        default_buffer_after: 15,
        max_advance_booking_days: 30,
        min_lead_time_hours: 2,
        working_hours: {
          monday: { enabled: true, start: '09:00', end: '17:00' },
          tuesday: { enabled: true, start: '09:00', end: '17:00' },
          wednesday: { enabled: true, start: '09:00', end: '17:00' },
          thursday: { enabled: true, start: '09:00', end: '17:00' },
          friday: { enabled: true, start: '09:00', end: '17:00' },
          saturday: { enabled: false, start: '09:00', end: '13:00' },
          sunday: { enabled: false, start: '09:00', end: '13:00' },
        },
        rooms_available: 1,
      },
      is_deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const businessId = businessResult.insertedId;

    // Create admin user
    const adminEmail = 'admin@buildhaze.com';
    const adminPassword = 'admin123'; // Change this in production!
    
    const passwordHash = await hashPassword(adminPassword);
    const emailHash = hashEmail(adminEmail);

    await db.collection('users').insertOne({
      business_id: businessId,
      email: adminEmail,
      email_hash: emailHash,
      password_hash: passwordHash,
      name: 'Admin User',
      role: UserRole.ADMIN,
      permissions: getDefaultPermissions(UserRole.ADMIN),
      service_ids: [],
      is_active: true,
      must_change_password: false,
      color: '#10b981',
      is_deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Seed completed successfully',
      credentials: {
        email: adminEmail,
        password: adminPassword,
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET - Show seed status
export async function GET() {
  try {
    await connectDB();
    const db = getDashboardDB();

    const userCount = await db.collection('users').countDocuments();
    const businessCount = await db.collection('businesses').countDocuments();

    return NextResponse.json({
      success: true,
      data: {
        users: userCount,
        businesses: businessCount,
        canSeed: userCount === 0,
      },
    });
  } catch (error) {
    console.error('Seed status error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
