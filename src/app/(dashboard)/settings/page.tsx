'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Clock,
  Mail,
  Bell,
  Link,
  Save,
  Loader2,
  CheckCircle,
} from 'lucide-react';

type TabType = 'business' | 'hours' | 'notifications' | 'integrations';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('business');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [businessSettings, setBusinessSettings] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    timezone: 'Europe/Bucharest',
    googleReviewUrl: '',
  });

  const [workingHours, setWorkingHours] = useState({
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: true, start: '09:00', end: '17:00' },
    saturday: { enabled: false, start: '09:00', end: '13:00' },
    sunday: { enabled: false, start: '09:00', end: '13:00' },
  });

  const [notifications, setNotifications] = useState({
    bookingConfirmation: true,
    bookingReminder: true,
    bookingCancellation: true,
    reviewRequest: true,
    reminderHours: 24,
  });

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: 'business' as TabType, label: 'Business', icon: Building2 },
    { id: 'hours' as TabType, label: 'Working Hours', icon: Clock },
    { id: 'notifications' as TabType, label: 'Notifications', icon: Bell },
    { id: 'integrations' as TabType, label: 'Integrations', icon: Link },
  ];

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 mt-1">Configure your business settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle className="w-5 h-5" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 border border-slate-200 border-b-white -mb-px'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
      >
        {activeTab === 'business' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Business Name
                </label>
                <input
                  type="text"
                  value={businessSettings.name}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Your Business Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={businessSettings.email}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, email: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="contact@business.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Phone
                </label>
                <input
                  type="tel"
                  value={businessSettings.phone}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, phone: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="+40 700 000 000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Website
                </label>
                <input
                  type="url"
                  value={businessSettings.website}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, website: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="https://yourbusiness.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Address
              </label>
              <input
                type="text"
                value={businessSettings.address}
                onChange={(e) => setBusinessSettings({ ...businessSettings, address: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="123 Main Street, City"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Timezone
                </label>
                <select
                  value={businessSettings.timezone}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, timezone: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Europe/Bucharest">Europe/Bucharest</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Europe/Paris">Europe/Paris</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="America/Los_Angeles">America/Los_Angeles</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Google Review URL
                </label>
                <input
                  type="url"
                  value={businessSettings.googleReviewUrl}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, googleReviewUrl: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="https://g.page/r/..."
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'hours' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 mb-4">
              Set your default business hours. These can be overridden per service or provider.
            </p>
            {days.map((day) => (
              <div key={day} className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0">
                <div className="w-32">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={workingHours[day].enabled}
                      onChange={(e) =>
                        setWorkingHours({
                          ...workingHours,
                          [day]: { ...workingHours[day], enabled: e.target.checked },
                        })
                      }
                      className="w-4 h-4 text-blue-500 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700 capitalize">{day}</span>
                  </label>
                </div>
                {workingHours[day].enabled ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={workingHours[day].start}
                      onChange={(e) =>
                        setWorkingHours({
                          ...workingHours,
                          [day]: { ...workingHours[day], start: e.target.value },
                        })
                      }
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="time"
                      value={workingHours[day].end}
                      onChange={(e) =>
                        setWorkingHours({
                          ...workingHours,
                          [day]: { ...workingHours[day], end: e.target.value },
                        })
                      }
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">Closed</span>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <p className="text-sm text-slate-500 mb-4">
              Configure automatic email notifications sent to clients.
            </p>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900">Booking Confirmation</p>
                    <p className="text-sm text-slate-500">Send confirmation email when booking is created</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.bookingConfirmation}
                  onChange={(e) => setNotifications({ ...notifications, bookingConfirmation: e.target.checked })}
                  className="w-5 h-5 text-blue-500 rounded border-slate-300 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900">Booking Reminder</p>
                    <p className="text-sm text-slate-500">Send reminder before appointment</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={notifications.reminderHours}
                    onChange={(e) => setNotifications({ ...notifications, reminderHours: Number(e.target.value) })}
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value={1}>1 hour before</option>
                    <option value={2}>2 hours before</option>
                    <option value={24}>24 hours before</option>
                    <option value={48}>48 hours before</option>
                  </select>
                  <input
                    type="checkbox"
                    checked={notifications.bookingReminder}
                    onChange={(e) => setNotifications({ ...notifications, bookingReminder: e.target.checked })}
                    className="w-5 h-5 text-blue-500 rounded border-slate-300 focus:ring-blue-500"
                  />
                </div>
              </label>

              <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900">Cancellation Notice</p>
                    <p className="text-sm text-slate-500">Send email when booking is cancelled</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.bookingCancellation}
                  onChange={(e) => setNotifications({ ...notifications, bookingCancellation: e.target.checked })}
                  className="w-5 h-5 text-blue-500 rounded border-slate-300 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900">Review Request</p>
                    <p className="text-sm text-slate-500">Request Google review after completed appointment</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.reviewRequest}
                  onChange={(e) => setNotifications({ ...notifications, reviewRequest: e.target.checked })}
                  className="w-5 h-5 text-blue-500 rounded border-slate-300 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <p className="text-sm text-slate-500 mb-4">
              Connect external services to enhance your booking system.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <span className="text-red-600 font-bold text-sm">G</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Google Calendar</p>
                    <p className="text-xs text-slate-500">Sync bookings with Google Calendar</p>
                  </div>
                </div>
                <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium transition-colors">
                  Connect
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">O</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Outlook Calendar</p>
                    <p className="text-xs text-slate-500">Sync bookings with Outlook</p>
                  </div>
                </div>
                <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium transition-colors">
                  Connect
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-bold text-sm">S</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Shopify</p>
                    <p className="text-xs text-slate-500">Receive bookings from Shopify</p>
                  </div>
                </div>
                <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium transition-colors">
                  Configure
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-sm">B</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Brevo (Email)</p>
                    <p className="text-xs text-slate-500">Transactional emails</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Connected
                </span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
