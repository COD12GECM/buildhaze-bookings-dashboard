'use client';

import { Users } from 'lucide-react';

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Team</h1>
        <p className="text-slate-500 mt-1">Manage your team members and providers</p>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
        <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Team Management Coming Soon</h3>
        <p className="text-slate-500 mt-2">Invite team members, assign roles, and manage permissions.</p>
      </div>
    </div>
  );
}
