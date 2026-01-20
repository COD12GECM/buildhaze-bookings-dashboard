'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Plus,
  Search,
  Clock,
  DollarSign,
  Users,
  MoreVertical,
  Loader2,
  CheckCircle,
  XCircle,
  X,
  Edit,
  Trash2,
  Timer,
} from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  buffer_before: number;
  buffer_after: number;
  min_lead_time_hours: number;
  max_advance_days: number;
  rooms_required: number;
  is_enabled: boolean;
  providers: { id: string; name: string }[];
  created_at: string;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services');
      const data = await response.json();

      if (data.success) {
        setServices(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Services</h1>
          <p className="text-slate-500 mt-1">
            {services.length} service{services.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Service</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">
            {searchQuery ? 'No services found' : 'No services yet'}
          </h3>
          <p className="text-slate-500 mt-2">
            {searchQuery
              ? 'Try adjusting your search'
              : 'Create your first service to start accepting bookings'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{service.name}</h3>
                    {service.is_enabled ? (
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                    ) : (
                      <span className="w-2 h-2 bg-slate-300 rounded-full" />
                    )}
                  </div>
                  {service.description && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                      {service.description}
                    </p>
                  )}
                </div>
                <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    Duration
                  </div>
                  <p className="font-semibold text-slate-900">
                    {formatDuration(service.duration)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    Price
                  </div>
                  <p className="font-semibold text-slate-900">
                    {formatPrice(service.price)}
                  </p>
                </div>
              </div>

              {(service.buffer_before > 0 || service.buffer_after > 0) && (
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  <Timer className="w-3.5 h-3.5" />
                  Buffer: {service.buffer_before > 0 && `${service.buffer_before}m before`}
                  {service.buffer_before > 0 && service.buffer_after > 0 && ' • '}
                  {service.buffer_after > 0 && `${service.buffer_after}m after`}
                </div>
              )}

              {service.providers && service.providers.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <Users className="w-3.5 h-3.5" />
                    Providers ({service.providers.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {service.providers.slice(0, 3).map((provider) => (
                      <span
                        key={provider.id}
                        className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs"
                      >
                        {provider.name}
                      </span>
                    ))}
                    {service.providers.length > 3 && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                        +{service.providers.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateServiceModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              fetchServices();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateServiceModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 60,
    price: 0,
    buffer_before: 0,
    buffer_after: 15,
    min_lead_time_hours: 2,
    max_advance_days: 30,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || 'Failed to create service');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900">Create Service</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Service Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., Consultation"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              placeholder="Brief description of the service"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Duration (minutes) *
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                min={5}
                step={5}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Price (RON) *
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                min={0}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Buffer Before (min)
              </label>
              <input
                type="number"
                value={formData.buffer_before}
                onChange={(e) => setFormData({ ...formData, buffer_before: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                min={0}
                step={5}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Buffer After (min)
              </label>
              <input
                type="number"
                value={formData.buffer_after}
                onChange={(e) => setFormData({ ...formData, buffer_after: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                min={0}
                step={5}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Min Lead Time (hours)
              </label>
              <input
                type="number"
                value={formData.min_lead_time_hours}
                onChange={(e) => setFormData({ ...formData, min_lead_time_hours: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Max Advance (days)
              </label>
              <input
                type="number"
                value={formData.max_advance_days}
                onChange={(e) => setFormData({ ...formData, max_advance_days: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                min={1}
                max={365}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Service'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
