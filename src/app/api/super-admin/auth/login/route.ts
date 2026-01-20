import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getDashboardDB } from '@/lib/db';
import { verifyPassword, hashEmail } from '@/lib/auth';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SUPER_ADMIN_SECRET = process.env.JWT_SECRET + '_super_admin';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    await connectDB();
    const db = getDashboardDB();

    // Find super admin by email hash
    const emailHash = hashEmail(email);
    const superAdmin = await db.collection('super_admins').findOne({
      email_hash: emailHash,
    });

    if (!superAdmin) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!superAdmin.is_active) {
      return NextResponse.json(
        { success: false, error: 'Account is disabled' },
        { status: 403 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, superAdmin.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login
    await db.collection('super_admins').updateOne(
      { _id: superAdmin._id },
      { $set: { last_login: new Date() } }
    );

    // Generate super admin token
    const token = jwt.sign(
      {
        type: 'super_admin',
        userId: superAdmin._id.toString(),
        email: superAdmin.email,
        name: superAdmin.name,
        permissions: superAdmin.permissions,
      },
      JWT_SUPER_ADMIN_SECRET,
      { expiresIn: '8h' }
    );

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('super_admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/',
    });

    return NextResponse.json({
      success: true,
      user: {
        id: superAdmin._id.toString(),
        email: superAdmin.email,
        name: superAdmin.name,
        permissions: superAdmin.permissions,
      },
    });
  } catch (error) {
    console.error('Super admin login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
