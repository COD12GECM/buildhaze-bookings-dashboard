'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Users,
  Clock,
  TrendingUp,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface Booking {
  id: number;
  date: string;
  time: string;
  name: string;
  email: string;
  service: string;
  status: string;
  teamMemberName?: string;
}

interface Stats {
  todayBookings: number;
  weekBookings: number;
  completedToday: number;
  pendingToday: number;
}

export default function DashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats>({
    todayBookings: 0,
    weekBookings: 0,
    completedToday: 0,
    pendingToday: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/bookings?date=${today}&limit=10`);
      const data = await res.json();

      if (data.success) {
        setBookings(data.data || []);
        
        const todayBookings = data.data || [];
        const completed = todayBookings.filter((b: Booking) => b.status === 'completed').length;
        const pending = todayBookings.filter((b: Booking) => b.status === 'confirmed').length;

        setStats({
          todayBookings: todayBookings.length,
          weekBookings: data.pagination?.total || 0,
          completedToday: completed,
          pendingToday: pending,
        });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-700';
      case 'arrived':
        return 'bg-yellow-100 text-yellow-700';
      case 'completed':
        return 'bg-emerald-100 text-emerald-700';
      case 'no-show':
        return 'bg-red-100 text-red-700';
      case 'cancelled':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const statCards = [
    {
      title: "Today's Bookings",
      value: stats.todayBookings,
      icon: Calendar,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
    },
    {
      title: 'Completed Today',
      value: stats.completedToday,
      icon: CheckCircle,
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-50',
    },
    {
      title: 'Pending',
      value: stats.pendingToday,
      icon: Clock,
      color: 'bg-amber-500',
      lightColor: 'bg-amber-50',
    },
    {
      title: 'This Week',
      value: stats.weekBookings,
      icon: TrendingUp,
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-4" />
              <div className="h-8 bg-slate-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back! Here&apos;s what&apos;s happening today.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{stat.title}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.lightColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Today's bookings */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Today&apos;s Bookings</h2>
            <p className="text-sm text-slate-500">Manage your appointments for today</p>
          </div>
          <Link
            href="/bookings"
            className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No bookings today</h3>
            <p className="text-slate-500 mt-1">Your schedule is clear for today.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {bookings.map((booking, index) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <span className="text-emerald-600 font-semibold">
                      {booking.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{booking.name}</p>
                    <p className="text-sm text-slate-500">{booking.service}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium text-slate-900">{booking.time}</p>
                    {booking.teamMemberName && (
                      <p className="text-sm text-slate-500">{booking.teamMemberName}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/bookings"
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all group"
        >
          <div className="p-3 rounded-xl bg-emerald-50 w-fit mb-4 group-hover:bg-emerald-100 transition-colors">
            <Calendar className="w-6 h-6 text-emerald-600" />
          </div>
          <h3 className="font-semibold text-slate-900">New Booking</h3>
          <p className="text-sm text-slate-500 mt-1">Create a new appointment</p>
        </Link>

        <Link
          href="/team"
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all group"
        >
          <div className="p-3 rounded-xl bg-blue-50 w-fit mb-4 group-hover:bg-blue-100 transition-colors">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-slate-900">Manage Team</h3>
          <p className="text-sm text-slate-500 mt-1">View and edit team members</p>
        </Link>

        <Link
          href="/analytics"
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:border-purple-200 hover:shadow-md transition-all group"
        >
          <div className="p-3 rounded-xl bg-purple-50 w-fit mb-4 group-hover:bg-purple-100 transition-colors">
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-semibold text-slate-900">View Analytics</h3>
          <p className="text-sm text-slate-500 mt-1">Check your performance</p>
        </Link>
      </div>
    </div>
  );
}
