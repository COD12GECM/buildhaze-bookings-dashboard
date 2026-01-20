import { NextResponse } from 'next/server';
import { connectDB, getDashboardDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { UserRole } from '@/types';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';

// GET /api/analytics - Get analytics overview
export async function GET() {
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

    // Only Admin can view full analytics
    if (payload.role !== UserRole.ADMIN && !payload.permissions?.can_view_analytics) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();
    const db = getDashboardDB();

    const businessId = new ObjectId(payload.businessId);

    // Get date ranges
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Total bookings
    const totalBookings = await db.collection('bookings').countDocuments({
      business_id: businessId,
      is_deleted: { $ne: true },
    });

    // This month's bookings
    const monthlyBookings = await db.collection('bookings').countDocuments({
      business_id: businessId,
      is_deleted: { $ne: true },
      created_at: { $gte: startOfMonth },
    });

    // Last month's bookings (for comparison)
    const lastMonthBookings = await db.collection('bookings').countDocuments({
      business_id: businessId,
      is_deleted: { $ne: true },
      created_at: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    });

    // Today's bookings
    const todayBookings = await db.collection('bookings').countDocuments({
      business_id: businessId,
      is_deleted: { $ne: true },
      created_at: { $gte: startOfToday },
    });

    // Booking status breakdown
    const statusBreakdown = await db.collection('bookings').aggregate([
      {
        $match: {
          business_id: businessId,
          is_deleted: { $ne: true },
          created_at: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]).toArray();

    const statusMap: Record<string, number> = {};
    statusBreakdown.forEach((s) => {
      statusMap[s._id || 'UNKNOWN'] = s.count;
    });

    const completed = statusMap['COMPLETED'] || 0;
    const cancelled = statusMap['CANCELLED'] || 0;
    const noShow = statusMap['NO_SHOW'] || 0;
    const confirmed = statusMap['CONFIRMED'] || 0;

    // Calculate rates
    const totalWithOutcome = completed + cancelled + noShow;
    const completionRate = totalWithOutcome > 0 ? Math.round((completed / totalWithOutcome) * 100) : 0;
    const cancellationRate = totalWithOutcome > 0 ? Math.round((cancelled / totalWithOutcome) * 100) : 0;
    const noShowRate = totalWithOutcome > 0 ? Math.round((noShow / totalWithOutcome) * 100) : 0;

    // Lead source breakdown
    const leadSourceBreakdown = await db.collection('bookings').aggregate([
      {
        $match: {
          business_id: businessId,
          is_deleted: { $ne: true },
          created_at: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: '$lead_source',
          count: { $sum: 1 },
        },
      },
    ]).toArray();

    const leadSources = leadSourceBreakdown.map((l) => ({
      source: l._id || 'MANUAL',
      count: l.count,
    }));

    // AI bookings count (for hours saved calculation)
    const aiBookings = leadSourceBreakdown.find((l) => l._id === 'AI_CHAT')?.count || 0;
    const humanHoursSaved = Math.round((aiBookings * 5) / 60 * 10) / 10; // 5 min per booking

    // Estimated service value (completed bookings × price)
    const serviceValueResult = await db.collection('bookings').aggregate([
      {
        $match: {
          business_id: businessId,
          is_deleted: { $ne: true },
          status: 'COMPLETED',
          created_at: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$price' },
        },
      },
    ]).toArray();

    const estimatedServiceValue = serviceValueResult[0]?.total || 0;

    // Service popularity
    const servicePopularity = await db.collection('bookings').aggregate([
      {
        $match: {
          business_id: businessId,
          is_deleted: { $ne: true },
          created_at: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: '$service_id',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]).toArray();

    // Get service names
    const serviceIds = servicePopularity.map((s) => s._id).filter(Boolean);
    const services = await db.collection('services').find({
      _id: { $in: serviceIds },
    }).toArray();

    const serviceMap = new Map(services.map((s) => [s._id.toString(), s.name]));

    const topServices = servicePopularity.map((s) => ({
      id: s._id?.toString(),
      name: serviceMap.get(s._id?.toString()) || 'Unknown',
      count: s.count,
    }));

    // Provider utilization
    const providerBookings = await db.collection('bookings').aggregate([
      {
        $match: {
          business_id: businessId,
          is_deleted: { $ne: true },
          created_at: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: '$provider_id',
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] },
          },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]).toArray();

    // Get provider names
    const providerIds = providerBookings.map((p) => p._id).filter(Boolean);
    const providers = await db.collection('users').find({
      _id: { $in: providerIds },
    }).toArray();

    const providerMap = new Map(providers.map((p) => [p._id.toString(), p.name]));

    const topProviders = providerBookings.map((p) => ({
      id: p._id?.toString(),
      name: providerMap.get(p._id?.toString()) || 'Unknown',
      bookings: p.count,
      completed: p.completed,
    }));

    // Daily bookings for the last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(startOfToday);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await db.collection('bookings').countDocuments({
        business_id: businessId,
        is_deleted: { $ne: true },
        created_at: { $gte: date, $lt: nextDate },
      });

      last7Days.push({
        date: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        count,
      });
    }

    // Calculate growth
    const monthlyGrowth = lastMonthBookings > 0
      ? Math.round(((monthlyBookings - lastMonthBookings) / lastMonthBookings) * 100)
      : monthlyBookings > 0 ? 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalBookings,
          monthlyBookings,
          todayBookings,
          monthlyGrowth,
          completionRate,
          cancellationRate,
          noShowRate,
          estimatedServiceValue,
          humanHoursSaved,
          aiBookings,
        },
        statusBreakdown: {
          confirmed,
          completed,
          cancelled,
          noShow,
        },
        leadSources,
        topServices,
        topProviders,
        dailyBookings: last7Days,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
