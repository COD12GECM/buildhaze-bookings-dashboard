'use client';

import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-500 mt-1">Track your business performance</p>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
        <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Analytics Dashboard Coming Soon</h3>
        <p className="text-slate-500 mt-2">View booking trends, revenue insights, and provider performance metrics.</p>
      </div>
    </div>
  );
}
