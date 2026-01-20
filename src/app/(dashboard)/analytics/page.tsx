'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle,
  Clock,
  Users,
  Briefcase,
  Bot,
  DollarSign,
  Loader2,
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalBookings: number;
    monthlyBookings: number;
    todayBookings: number;
    monthlyGrowth: number;
    completionRate: number;
    cancellationRate: number;
    noShowRate: number;
    estimatedServiceValue: number;
    humanHoursSaved: number;
    aiBookings: number;
  };
  statusBreakdown: {
    confirmed: number;
    completed: number;
    cancelled: number;
    noShow: number;
  };
  leadSources: { source: string; count: number }[];
  topServices: { id: string; name: string; count: number }[];
  topProviders: { id: string; name: string; bookings: number; completed: number }[];
  dailyBookings: { date: string; day: string; count: number }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics');
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getLeadSourceLabel = (source: string) => {
    switch (source) {
      case 'AI_CHAT':
        return 'AI Chat';
      case 'DIRECT_LINK':
        return 'Direct Link';
      case 'MANUAL_STAFF':
        return 'Staff';
      case 'PROVIDER_SELF':
        return 'Provider';
      case 'ADMIN_MANUAL':
        return 'Admin';
      case 'SHOPIFY':
        return 'Shopify';
      default:
        return 'Manual';
    }
  };

  const getLeadSourceColor = (source: string) => {
    switch (source) {
      case 'AI_CHAT':
        return 'bg-purple-500';
      case 'DIRECT_LINK':
        return 'bg-blue-500';
      case 'MANUAL_STAFF':
        return 'bg-emerald-500';
      case 'SHOPIFY':
        return 'bg-green-500';
      default:
        return 'bg-slate-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
        <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900">No Analytics Data</h3>
        <p className="text-slate-500 mt-2">Start creating bookings to see analytics.</p>
      </div>
    );
  }

  const maxDailyBookings = Math.max(...data.dailyBookings.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-500 mt-1">Track your business performance this month</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            {data.overview.monthlyGrowth !== 0 && (
              <span
                className={`flex items-center gap-1 text-sm font-medium ${
                  data.overview.monthlyGrowth > 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {data.overview.monthlyGrowth > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {Math.abs(data.overview.monthlyGrowth)}%
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-slate-900">{data.overview.monthlyBookings}</p>
          <p className="text-sm text-slate-500">Bookings this month</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-emerald-600">
              {data.overview.completionRate}%
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{data.statusBreakdown.completed}</p>
          <p className="text-sm text-slate-500">Completed</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm font-medium text-amber-600">
              {data.overview.noShowRate}%
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{data.statusBreakdown.noShow}</p>
          <p className="text-sm text-slate-500">No-shows</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{data.overview.humanHoursSaved}h</p>
          <p className="text-sm text-slate-500">Hours saved by AI</p>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Bookings Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Last 7 Days</h3>
          <div className="flex items-end justify-between gap-2 h-40">
            {data.dailyBookings.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center">
                  <span className="text-xs font-medium text-slate-900 mb-1">{day.count}</span>
                  <div
                    className="w-full bg-blue-500 rounded-t-lg transition-all duration-500"
                    style={{
                      height: `${Math.max((day.count / maxDailyBookings) * 100, 4)}px`,
                      minHeight: '4px',
                    }}
                  />
                </div>
                <span className="text-xs text-slate-500">{day.day}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Lead Sources */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Booking Sources</h3>
          {data.leadSources.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {data.leadSources.map((source) => {
                const total = data.leadSources.reduce((sum, s) => sum + s.count, 0);
                const percentage = total > 0 ? Math.round((source.count / total) * 100) : 0;
                return (
                  <div key={source.source}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">
                        {getLeadSourceLabel(source.source)}
                      </span>
                      <span className="text-sm text-slate-500">
                        {source.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getLeadSourceColor(source.source)}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estimated Value */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-blue-100 text-sm">Estimated Service Value</p>
              <p className="text-2xl font-bold">{formatCurrency(data.overview.estimatedServiceValue)}</p>
            </div>
          </div>
          <p className="text-blue-100 text-xs">
            Based on completed bookings this month. This is not actual revenue.
          </p>
        </motion.div>

        {/* Top Services */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900">Top Services</h3>
          </div>
          {data.topServices.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No data yet</p>
          ) : (
            <div className="space-y-3">
              {data.topServices.map((service, index) => (
                <div key={service.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-xs font-medium text-slate-600">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-700">{service.name}</span>
                  </div>
                  <span className="text-sm text-slate-500">{service.count} bookings</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Top Providers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900">Top Providers</h3>
          </div>
          {data.topProviders.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No data yet</p>
          ) : (
            <div className="space-y-3">
              {data.topProviders.map((provider, index) => (
                <div key={provider.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-xs font-medium text-emerald-600">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-700">{provider.name}</span>
                  </div>
                  <span className="text-sm text-slate-500">{provider.bookings} bookings</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
