'use client';

import { Calendar } from 'lucide-react';

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
        <p className="text-slate-500 mt-1">View and manage your schedule</p>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
        <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Calendar View Coming Soon</h3>
        <p className="text-slate-500 mt-2">Full calendar integration with FullCalendar will be available here.</p>
      </div>
    </div>
  );
}
