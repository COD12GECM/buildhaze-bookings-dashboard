'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  User,
  Briefcase,
  Settings,
  UserPlus,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react';

interface AuditLog {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id?: string;
  previous_state?: Record<string, unknown>;
  new_state?: Record<string, unknown>;
  performed_by: string;
  performed_by_name: string;
  performed_by_type: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    eventType: '',
    entityType: '',
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (filters.eventType) params.append('event_type', filters.eventType);
      if (filters.entityType) params.append('entity_type', filters.entityType);

      const response = await fetch(`/api/audit-logs?${params}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.data.logs || []);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('CREATED') || eventType.includes('INVITE')) {
      return <UserPlus className="w-4 h-4" />;
    }
    if (eventType.includes('UPDATED') || eventType.includes('MODIFIED')) {
      return <Edit className="w-4 h-4" />;
    }
    if (eventType.includes('DELETED') || eventType.includes('CANCELLED')) {
      return <Trash2 className="w-4 h-4" />;
    }
    if (eventType.includes('BOOKING')) {
      return <Calendar className="w-4 h-4" />;
    }
    if (eventType.includes('SERVICE')) {
      return <Briefcase className="w-4 h-4" />;
    }
    if (eventType.includes('USER') || eventType.includes('TEAM')) {
      return <User className="w-4 h-4" />;
    }
    return <Settings className="w-4 h-4" />;
  };

  const getEventColor = (eventType: string) => {
    if (eventType.includes('CREATED') || eventType.includes('COMPLETED')) {
      return 'bg-emerald-100 text-emerald-700';
    }
    if (eventType.includes('DELETED') || eventType.includes('CANCELLED')) {
      return 'bg-red-100 text-red-700';
    }
    if (eventType.includes('UPDATED') || eventType.includes('MODIFIED')) {
      return 'bg-blue-100 text-blue-700';
    }
    if (eventType.includes('INVITE')) {
      return 'bg-purple-100 text-purple-700';
    }
    return 'bg-slate-100 text-slate-700';
  };

  const formatEventType = (eventType: string) => {
    return eventType
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const eventTypes = [
    'BOOKING_CREATED',
    'BOOKING_UPDATED',
    'BOOKING_CANCELLED',
    'BOOKING_COMPLETED',
    'SERVICE_CREATED',
    'SERVICE_UPDATED',
    'USER_CREATED',
    'TEAM_INVITE_SENT',
    'SETTINGS_UPDATED',
  ];

  const entityTypes = ['BOOKING', 'SERVICE', 'USER', 'INVITATION', 'SETTINGS'];

  if (loading && logs.length === 0) {
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
        <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
        <p className="text-slate-500 mt-1">
          Track all changes and actions in your business
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          <select
            value={filters.eventType}
            onChange={(e) => {
              setFilters({ ...filters, eventType: e.target.value });
              setPagination({ ...pagination, page: 1 });
            }}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Events</option>
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {formatEventType(type)}
              </option>
            ))}
          </select>

          <select
            value={filters.entityType}
            onChange={(e) => {
              setFilters({ ...filters, entityType: e.target.value });
              setPagination({ ...pagination, page: 1 });
            }}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Entities</option>
            {entityTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0) + type.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="text-sm text-slate-500 flex items-center">
          {pagination.total} total logs
        </div>
      </div>

      {/* Logs List */}
      {logs.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No audit logs found</h3>
          <p className="text-slate-500 mt-2">
            {filters.eventType || filters.entityType
              ? 'Try adjusting your filters'
              : 'Actions will be logged here automatically'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setSelectedLog(log)}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${getEventColor(
                      log.event_type
                    )}`}
                  >
                    {getEventIcon(log.event_type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900">
                        {formatEventType(log.event_type)}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {log.entity_type}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      by {log.performed_by_name}
                      {log.performed_by_type && log.performed_by_type !== 'ADMIN' && (
                        <span className="text-slate-400"> ({log.performed_by_type})</span>
                      )}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-slate-500">{formatDate(log.created_at)}</p>
                    <button className="text-blue-500 hover:text-blue-600 text-sm mt-1 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      Details
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
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

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Log Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Event Type</p>
                  <p className="font-medium text-slate-900">
                    {formatEventType(selectedLog.event_type)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Entity Type</p>
                  <p className="font-medium text-slate-900">{selectedLog.entity_type}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Performed By</p>
                  <p className="font-medium text-slate-900">{selectedLog.performed_by_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date & Time</p>
                  <p className="font-medium text-slate-900">
                    {formatDate(selectedLog.created_at)}
                  </p>
                </div>
              </div>

              {selectedLog.entity_id && (
                <div>
                  <p className="text-sm text-slate-500">Entity ID</p>
                  <p className="font-mono text-sm text-slate-700 bg-slate-100 px-3 py-2 rounded-lg">
                    {selectedLog.entity_id}
                  </p>
                </div>
              )}

              {selectedLog.new_state && Object.keys(selectedLog.new_state).length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">New State</p>
                  <pre className="text-xs text-slate-700 bg-slate-100 p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedLog.new_state, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.previous_state && Object.keys(selectedLog.previous_state).length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Previous State</p>
                  <pre className="text-xs text-slate-700 bg-slate-100 p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedLog.previous_state, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Metadata</p>
                  <pre className="text-xs text-slate-700 bg-slate-100 p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
