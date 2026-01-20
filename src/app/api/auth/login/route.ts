import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getDashboardDB } from '@/lib/db';
import { verifyPassword, generateAccessToken, setAuthCookie, hashEmail } from '@/lib/auth';
import { UserRole } from '@/types';

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

    // Find user by email hash
    const emailHash = hashEmail(email);
    const user = await db.collection('users').findOne({
      email_hash: emailHash,
      is_deleted: false,
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { success: false, error: 'Account is disabled. Please contact your administrator.' },
        { status: 403 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { last_login: new Date() } }
    );

    // Generate token
    const token = generateAccessToken({
      userId: user._id.toString(),
      businessId: user.business_id.toString(),
      email: user.email,
      role: user.role as UserRole,
      permissions: user.permissions,
    });

    // Set cookie
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        must_change_password: user.must_change_password,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
