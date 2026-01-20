'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  MessageSquare,
  X,
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  meta_stats: {
    total_bookings: number;
    completed_bookings: number;
    cancelled_bookings: number;
    no_shows: number;
    total_spent: number;
  };
  behavioral_tags: string[];
  notes_count: number;
  first_visit?: string;
  last_visit?: string;
  created_at: string;
}

interface ClientDetails {
  id: string;
  name: string;
  identifiers: { type: string; value: string; is_primary?: boolean }[];
  meta_stats: {
    total_bookings: number;
    completed_bookings: number;
    cancelled_bookings: number;
    no_shows: number;
    total_spent: number;
  };
  behavioral_tags: string[];
  notes: { id: string; content: string; created_by: string; created_at: string }[];
  bookings: {
    id: string;
    date: string;
    time: string;
    duration: number;
    service_name: string;
    provider_name: string;
    status: string;
    price: number;
  }[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchClients();
  }, [pagination.page, searchQuery]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/clients?${params}`);
      const data = await response.json();

      if (data.success) {
        setClients(data.data.clients || []);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientDetails = async (clientId: string) => {
    setLoadingDetails(true);
    try {
      const response = await fetch(`/api/clients/${clientId}`);
      const data = await response.json();

      if (data.success) {
        setSelectedClient(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch client details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-700';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-700';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700';
      case 'NO_SHOW':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getTagColor = (tag: string) => {
    const colors: Record<string, string> = {
      VIP: 'bg-purple-100 text-purple-700',
      NEW: 'bg-blue-100 text-blue-700',
      LOYAL: 'bg-emerald-100 text-emerald-700',
      'AT_RISK': 'bg-amber-100 text-amber-700',
      CHURNED: 'bg-red-100 text-red-700',
    };
    return colors[tag] || 'bg-slate-100 text-slate-700';
  };

  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
        <p className="text-slate-500 mt-1">
          {pagination.total} client{pagination.total !== 1 ? 's' : ''} in your database
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search clients by name..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPagination({ ...pagination, page: 1 });
          }}
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Clients List */}
      {clients.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">
            {searchQuery ? 'No clients found' : 'No clients yet'}
          </h3>
          <p className="text-slate-500 mt-2">
            {searchQuery
              ? 'Try adjusting your search'
              : 'Clients will appear here when they make bookings'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                    Client
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                    Contact
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                    Stats
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                    Tags
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">
                    Last Visit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((client) => (
                  <motion.tr
                    key={client.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => fetchClientDetails(client.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{client.name}</p>
                          {client.notes_count > 0 && (
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {client.notes_count} note{client.notes_count !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {client.email && (
                          <p className="text-sm text-slate-600 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {client.email}
                          </p>
                        )}
                        {client.phone && (
                          <p className="text-sm text-slate-600 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {client.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <p className="font-semibold text-slate-900">
                            {client.meta_stats.total_bookings}
                          </p>
                          <p className="text-xs text-slate-500">Bookings</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-emerald-600">
                            {client.meta_stats.completed_bookings}
                          </p>
                          <p className="text-xs text-slate-500">Completed</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-slate-900">
                            {formatCurrency(client.meta_stats.total_spent)}
                          </p>
                          <p className="text-xs text-slate-500">Spent</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {client.behavioral_tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className={`px-2 py-0.5 rounded text-xs font-medium ${getTagColor(tag)}`}
                          >
                            {tag}
                          </span>
                        ))}
                        {client.behavioral_tags.length > 3 && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                            +{client.behavioral_tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">
                        {formatDate(client.last_visit || '')}
                      </p>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
              <p className="text-sm text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.totalPages}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Client Details Slide-out */}
      <AnimatePresence>
        {(selectedClient || loadingDetails) && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setSelectedClient(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 overflow-y-auto"
            >
              {loadingDetails ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : selectedClient ? (
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-slate-900">Client Profile</h2>
                    <button
                      onClick={() => setSelectedClient(null)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>

                  {/* Client Info */}
                  <div className="bg-slate-50 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-2xl">
                          {selectedClient.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {selectedClient.name}
                        </h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedClient.behavioral_tags.map((tag) => (
                            <span
                              key={tag}
                              className={`px-2 py-0.5 rounded text-xs font-medium ${getTagColor(tag)}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {selectedClient.identifiers.map((id, idx) => (
                        <p key={idx} className="text-sm text-slate-600 flex items-center gap-2">
                          {id.type === 'email' ? (
                            <Mail className="w-4 h-4 text-slate-400" />
                          ) : (
                            <Phone className="w-4 h-4 text-slate-400" />
                          )}
                          {id.value}
                          {id.is_primary && (
                            <span className="text-xs text-blue-500">(primary)</span>
                          )}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-3 mb-6">
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedClient.meta_stats.total_bookings}
                      </p>
                      <p className="text-xs text-slate-500">Total</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-600">
                        {selectedClient.meta_stats.completed_bookings}
                      </p>
                      <p className="text-xs text-slate-500">Completed</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {selectedClient.meta_stats.cancelled_bookings}
                      </p>
                      <p className="text-xs text-slate-500">Cancelled</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-amber-600">
                        {selectedClient.meta_stats.no_shows}
                      </p>
                      <p className="text-xs text-slate-500">No Shows</p>
                    </div>
                  </div>

                  {/* Total Spent */}
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 mb-6 text-white">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-8 h-8 opacity-80" />
                      <div>
                        <p className="text-blue-100 text-sm">Total Spent</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(selectedClient.meta_stats.total_spent)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedClient.notes.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Notes ({selectedClient.notes.length})
                      </h4>
                      <div className="space-y-2">
                        {selectedClient.notes.slice(0, 3).map((note) => (
                          <div
                            key={note.id}
                            className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600"
                          >
                            <p>{note.content}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {formatDate(note.created_at)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Booking History */}
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Booking History ({selectedClient.bookings.length})
                    </h4>
                    {selectedClient.bookings.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">No bookings yet</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedClient.bookings.slice(0, 10).map((booking) => (
                          <div
                            key={booking.id}
                            className="bg-slate-50 rounded-lg p-3 flex items-center justify-between"
                          >
                            <div>
                              <p className="font-medium text-slate-900 text-sm">
                                {booking.service_name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {booking.date} at {booking.time} • {booking.provider_name}
                              </p>
                            </div>
                            <div className="text-right">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                                  booking.status
                                )}`}
                              >
                                {booking.status}
                              </span>
                              <p className="text-sm font-medium text-slate-900 mt-1">
                                {formatCurrency(booking.price)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
