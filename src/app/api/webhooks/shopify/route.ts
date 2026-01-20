import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getDashboardDB } from '@/lib/db';
import { hashEmail, encrypt } from '@/lib/auth';
import { sendBookingConfirmation } from '@/lib/brevo';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';

// Verify Shopify webhook signature
function verifyShopifyWebhook(body: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body, 'utf8');
  const digest = hmac.digest('base64');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// POST /api/webhooks/shopify - Receive booking from Shopify widget
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const shopifySignature = request.headers.get('x-shopify-hmac-sha256');
    const shopifySecret = process.env.SHOPIFY_WEBHOOK_SECRET;

    // Verify webhook signature if secret is configured
    if (shopifySecret && shopifySignature) {
      const isValid = verifyShopifyWebhook(body, shopifySignature, shopifySecret);
      if (!isValid) {
        console.error('Invalid Shopify webhook signature');
        return NextResponse.json(
          { success: false, error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    const data = JSON.parse(body);

    // Extract booking data from Shopify payload
    const {
      business_email, // Used to identify the business
      client_name,
      client_email,
      client_phone,
      service_id,
      provider_id,
      date,
      time,
      notes,
      shopify_order_id,
    } = data;

    if (!business_email || !client_name || !client_email || !service_id || !date || !time) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();
    const db = getDashboardDB();

    // Find business by email
    const businessEmailHash = hashEmail(business_email);
    const business = await db.collection('businesses').findOne({
      email_hash: businessEmailHash,
      is_deleted: { $ne: true },
    });

    if (!business) {
      console.error('Business not found for email:', business_email);
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      );
    }

    const businessId = business._id;

    // Get service
    const service = await db.collection('services').findOne({
      _id: new ObjectId(service_id),
      business_id: businessId,
      is_deleted: { $ne: true },
    });

    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404 }
      );
    }

    // Get or create client
    const clientEmailHash = hashEmail(client_email);
    let client = await db.collection('clients').findOne({
      business_id: businessId,
      'identifiers.email_hash': clientEmailHash,
    });

    if (!client) {
      // Create new client
      const clientResult = await db.collection('clients').insertOne({
        business_id: businessId,
        identifiers: [
          {
            type: 'email',
            value: encrypt(client_email),
            email_hash: clientEmailHash,
            is_primary: true,
          },
          ...(client_phone
            ? [
                {
                  type: 'phone',
                  value: encrypt(client_phone),
                  is_primary: false,
                },
              ]
            : []),
        ],
        name: client_name,
        notes: [],
        meta_stats: {
          total_bookings: 0,
          completed_bookings: 0,
          cancelled_bookings: 0,
          no_shows: 0,
          total_spent: 0,
          first_visit: new Date(),
          last_visit: null,
        },
        behavioral_tags: [],
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date(),
      });
      client = { _id: clientResult.insertedId, name: client_name };
    }

    // Get provider (if specified, otherwise use first available)
    let providerId = null;
    if (provider_id) {
      providerId = new ObjectId(provider_id);
    } else if (service.provider_ids && service.provider_ids.length > 0) {
      providerId = service.provider_ids[0];
    }

    // Create booking
    const bookingResult = await db.collection('bookings').insertOne({
      business_id: businessId,
      client_id: client._id,
      service_id: service._id,
      provider_id: providerId,
      date,
      time,
      duration: service.duration,
      price: service.price,
      status: 'CONFIRMED',
      lead_source: 'SHOPIFY',
      notes: notes || '',
      external_refs: {
        shopify_order_id: shopify_order_id || null,
      },
      reminder_sent: false,
      review_requested: false,
      is_deleted: false,
      version: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Update client stats
    await db.collection('clients').updateOne(
      { _id: client._id },
      {
        $inc: { 'meta_stats.total_bookings': 1 },
        $set: { updated_at: new Date() },
      }
    );

    // Send confirmation email
    await sendBookingConfirmation({
      clientEmail: client_email,
      clientName: client_name,
      serviceName: service.name,
      providerName: providerId ? 'Your provider' : 'TBD',
      date,
      time,
      businessName: business.name,
    });

    // Log audit
    await db.collection('audit_logs').insertOne({
      business_id: businessId,
      event_type: 'BOOKING_CREATED',
      entity_type: 'BOOKING',
      entity_id: bookingResult.insertedId,
      previous_state: null,
      new_state: {
        client_id: client._id.toString(),
        service_id: service._id.toString(),
        date,
        time,
        status: 'CONFIRMED',
      },
      performed_by: 'SHOPIFY_WEBHOOK',
      performed_by_type: 'SYSTEM',
      metadata: { shopify_order_id },
      created_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: {
        booking_id: bookingResult.insertedId.toString(),
        client_id: client._id.toString(),
        status: 'CONFIRMED',
      },
    });
  } catch (error) {
    console.error('Shopify webhook error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Health check for webhook endpoint
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Shopify webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
