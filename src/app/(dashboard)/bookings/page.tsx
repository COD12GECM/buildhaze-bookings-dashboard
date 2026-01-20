'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Search,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  MoreVertical,
  User,
} from 'lucide-react';

interface Booking {
  id: number;
  date: string;
  time: string;
  name: string;
  email: string;
  phone?: string;
  service: string;
  status: string;
  teamMemberName?: string;
  notes?: string;
}

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'arrived', label: 'Arrived' },
  { value: 'completed', label: 'Completed' },
  { value: 'no-show', label: 'No Show' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchBookings();
  }, [filter, currentPage]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });
      
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const res = await fetch(`/api/bookings?${params}`);
      const data = await res.json();

      if (data.success) {
        setBookings(data.data || []);
        setTotalPages(Math.ceil((data.pagination?.total || 0) / 20));
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        fetchBookings();
        setSelectedBooking(null);
      }
    } catch (error) {
      console.error('Failed to update booking:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'arrived':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'completed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'no-show':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'cancelled':
        return 'bg-slate-100 text-slate-500 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      booking.name?.toLowerCase().includes(query) ||
      booking.email?.toLowerCase().includes(query) ||
      booking.service?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
          <p className="text-slate-500 mt-1">Manage all your appointments</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors">
          <Plus className="w-5 h-5" />
          New Booking
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Bookings list */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No bookings found</h3>
            <p className="text-slate-500 mt-1">Try adjusting your filters or create a new booking.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((booking) => (
                  <motion.tr
                    key={booking.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                          <span className="text-emerald-600 font-semibold">
                            {booking.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{booking.name}</p>
                          <p className="text-sm text-slate-500">{booking.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-900">{booking.service}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-900">{booking.date}</p>
                      <p className="text-sm text-slate-500">{booking.time}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-900">{booking.teamMemberName || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium capitalize border ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBooking(booking);
                        }}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-5 h-5 text-slate-400" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Booking details slide-out panel */}
      <AnimatePresence>
        {selectedBooking && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Booking Details</h2>
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="p-2 hover:bg-slate-100 rounded-lg"
                  >
                    <XCircle className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {/* Client info */}
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
                      <span className="text-emerald-600 font-bold text-2xl">
                        {selectedBooking.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{selectedBooking.name}</h3>
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium capitalize mt-1 ${getStatusColor(selectedBooking.status)}`}>
                        {selectedBooking.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Date</p>
                      <p className="font-semibold text-slate-900">{selectedBooking.date}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Time</p>
                      <p className="font-semibold text-slate-900">{selectedBooking.time}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <Mail className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-900">{selectedBooking.email}</span>
                    </div>
                    {selectedBooking.phone && (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <Phone className="w-5 h-5 text-slate-400" />
                        <span className="text-slate-900">{selectedBooking.phone}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Service</p>
                    <p className="font-medium text-slate-900">{selectedBooking.service}</p>
                  </div>

                  {selectedBooking.teamMemberName && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Provider</p>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium text-slate-900">{selectedBooking.teamMemberName}</span>
                      </div>
                    </div>
                  )}

                  {selectedBooking.notes && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Notes</p>
                      <p className="text-slate-700">{selectedBooking.notes}</p>
                    </div>
                  )}

                  {/* Quick actions */}
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Quick Actions</p>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedBooking.status === 'confirmed' && (
                        <button
                          onClick={() => updateBookingStatus(selectedBooking.id, 'arrived')}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-100 text-yellow-700 rounded-xl font-medium hover:bg-yellow-200 transition-colors"
                        >
                          <Clock className="w-4 h-4" />
                          Check In
                        </button>
                      )}
                      {selectedBooking.status === 'arrived' && (
                        <button
                          onClick={() => updateBookingStatus(selectedBooking.id, 'completed')}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-100 text-emerald-700 rounded-xl font-medium hover:bg-emerald-200 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Complete
                        </button>
                      )}
                      {selectedBooking.status !== 'cancelled' && selectedBooking.status !== 'completed' && (
                        <button
                          onClick={() => updateBookingStatus(selectedBooking.id, 'no-show')}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          No Show
                        </button>
                      )}
                    </div>
                    {selectedBooking.status !== 'cancelled' && selectedBooking.status !== 'completed' && (
                      <button
                        onClick={() => updateBookingStatus(selectedBooking.id, 'cancelled')}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors"
                      >
                        Cancel Booking
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
