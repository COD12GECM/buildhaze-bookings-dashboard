'use client';

import { Briefcase } from 'lucide-react';

export default function ServicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Services</h1>
        <p className="text-slate-500 mt-1">Manage your service offerings</p>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
        <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Services Management Coming Soon</h3>
        <p className="text-slate-500 mt-2">Create and manage your services with pricing, duration, and availability rules.</p>
      </div>
    </div>
  );
}
