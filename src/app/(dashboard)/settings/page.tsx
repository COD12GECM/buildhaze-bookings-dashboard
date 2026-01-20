'use client';

import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Configure your business settings</p>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
        <Settings className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Settings Panel Coming Soon</h3>
        <p className="text-slate-500 mt-2">Configure business hours, email templates, integrations, and more.</p>
      </div>
    </div>
  );
}
