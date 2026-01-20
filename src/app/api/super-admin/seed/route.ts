import { NextResponse } from 'next/server';
import { connectDB, getDashboardDB } from '@/lib/db';
import { hashPassword, hashEmail, encrypt } from '@/lib/auth';

// POST /api/super-admin/seed - Create initial super admin (only works if none exist)
export async function POST() {
  try {
    await connectDB();
    const db = getDashboardDB();

    // Check if any super admins exist
    const existingCount = await db.collection('super_admins').countDocuments();

    if (existingCount > 0) {
      return NextResponse.json({
        success: false,
        error: 'Super admins already exist. Seed is only for initial setup.',
      }, { status: 400 });
    }

    // Create the initial super admin
    const email = 'admin@buildhaze.com';
    const password = 'BuildHaze2024!'; // Change this immediately after first login!
    
    const passwordHash = await hashPassword(password);
    const emailHash = hashEmail(email);
    const encryptedEmail = encrypt(email);

    await db.collection('super_admins').insertOne({
      email: encryptedEmail,
      email_hash: emailHash,
      password_hash: passwordHash,
      name: 'BuildHaze Admin',
      permissions: {
        can_create_businesses: true,
        can_ghost_login: true,
        can_view_all_data: true,
        can_manage_platform: true,
      },
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Super admin created successfully',
      credentials: {
        email,
        password,
        note: 'CHANGE THIS PASSWORD IMMEDIATELY!',
      },
    });
  } catch (error) {
    console.error('Seed super admin error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET - Check if seed is needed
export async function GET() {
  try {
    await connectDB();
    const db = getDashboardDB();

    const count = await db.collection('super_admins').countDocuments();

    return NextResponse.json({
      success: true,
      data: {
        super_admins_exist: count > 0,
        count,
        can_seed: count === 0,
      },
    });
  } catch (error) {
    console.error('Check seed status error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
