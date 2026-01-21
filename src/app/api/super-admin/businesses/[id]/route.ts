import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getDashboardDB } from '@/lib/db';
import { encrypt, hashEmail } from '@/lib/auth';
import { sendAdminInvitation } from '@/lib/brevo';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SUPER_ADMIN_SECRET = process.env.JWT_SECRET + '_super_admin';

// Verify super admin token
async function verifySuperAdmin(): Promise<{ valid: boolean; error?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get('super_admin_token')?.value;

  if (!token) {
    return { valid: false, error: 'Unauthorized' };
  }

  try {
    const payload = jwt.verify(token, JWT_SUPER_ADMIN_SECRET) as {
      type: string;
      userId: string;
      email: string;
      name: string;
      permissions: Record<string, boolean>;
    };
    
    if (payload.type !== 'super_admin') {
      return { valid: false, error: 'Invalid super admin token' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid token' };
  }
}

// DELETE /api/super-admin/businesses/[id] - Delete a business
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifySuperAdmin();
    if (!auth.valid) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    await connectDB();
    const db = getDashboardDB();

    const businessId = new ObjectId(id);

    // Check if business exists
    const business = await db.collection('businesses').findOne({ _id: businessId });
    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      );
    }

    // Soft delete business
    await db.collection('businesses').updateOne(
      { _id: businessId },
      { $set: { is_deleted: true, deleted_at: new Date() } }
    );

    // Also delete related invitations
    await db.collection('invitations').updateMany(
      { business_id: businessId },
      { $set: { is_deleted: true, deleted_at: new Date() } }
    );

    // Soft delete users
    await db.collection('users').updateMany(
      { business_id: businessId },
      { $set: { is_deleted: true, deleted_at: new Date() } }
    );

    return NextResponse.json({
      success: true,
      message: 'Business deleted successfully',
    });
  } catch (error) {
    console.error('Delete business error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/super-admin/businesses/[id]/resend-invite - Resend admin invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifySuperAdmin();
    if (!auth.valid) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    await connectDB();
    const db = getDashboardDB();

    const businessId = new ObjectId(id);

    // Get business
    const business = await db.collection('businesses').findOne({
      _id: businessId,
      is_deleted: { $ne: true },
    });

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      );
    }

    // Find existing pending invitation
    const existingInvite = await db.collection('invitations').findOne({
      business_id: businessId,
      type: 'ADMIN',
      status: 'PENDING',
      is_deleted: { $ne: true },
    });

    let inviteCode: string;
    let adminEmail: string;

    if (existingInvite) {
      // Update existing invitation with new expiry
      inviteCode = existingInvite.code;
      adminEmail = existingInvite.email;
      
      await db.collection('invitations').updateOne(
        { _id: existingInvite._id },
        {
          $set: {
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            updated_at: new Date(),
          },
        }
      );
    } else {
      // Create new invitation
      inviteCode = crypto.randomBytes(16).toString('hex');
      
      // Get admin email from business or request
      const body = await request.json().catch(() => ({}));
      adminEmail = body.email || business.admin_email;

      if (!adminEmail) {
        return NextResponse.json(
          { success: false, error: 'No admin email found for this business' },
          { status: 400 }
        );
      }

      await db.collection('invitations').insertOne({
        business_id: businessId,
        type: 'ADMIN',
        email: encrypt(adminEmail),
        email_hash: hashEmail(adminEmail),
        code: inviteCode,
        role_config: { role: 'ADMIN', permissions: ['*'] },
        status: 'PENDING',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        created_by: 'SUPER_ADMIN',
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Send invitation email
    await sendAdminInvitation({
      email: adminEmail,
      name: business.name,
      inviteCode,
      inviterName: 'BuildHaze',
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation resent successfully',
      data: { inviteCode },
    });
  } catch (error) {
    console.error('Resend invite error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
