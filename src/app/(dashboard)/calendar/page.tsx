'use client';

import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg, DateSelectArg } from '@fullcalendar/core';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  User,
  Briefcase,
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    bookingId: string;
    clientName: string;
    clientEmail: string;
    serviceName: string;
    providerName: string;
    status: string;
  };
}

interface BookingDetails {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceName: string;
  providerName: string;
  date: string;
  time: string;
  duration: number;
  status: string;
  notes?: string;
}

export default function CalendarPage() {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('timeGridWeek');
  const [selectedBooking, setSelectedBooking] = useState<BookingDetails | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/bookings');
      const data = await response.json();

      if (data.success && data.data) {
        const calendarEvents: CalendarEvent[] = data.data.map((booking: {
          id: string;
          client: { name: string; email: string };
          service: { name: string };
          provider: { name: string };
          date: string;
          time: string;
          duration: number;
          status: string;
        }) => {
          const startDate = new Date(`${booking.date}T${booking.time}`);
          const endDate = new Date(startDate.getTime() + booking.duration * 60000);
          
          const statusColors: Record<string, { bg: string; border: string }> = {
            CONFIRMED: { bg: '#3b82f6', border: '#2563eb' },
            ARRIVED: { bg: '#10b981', border: '#059669' },
            COMPLETED: { bg: '#6b7280', border: '#4b5563' },
            CANCELLED: { bg: '#ef4444', border: '#dc2626' },
            NO_SHOW: { bg: '#f59e0b', border: '#d97706' },
          };

          const colors = statusColors[booking.status] || statusColors.CONFIRMED;

          return {
            id: booking.id,
            title: `${booking.client?.name || 'Client'} - ${booking.service?.name || 'Service'}`,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            backgroundColor: colors.bg,
            borderColor: colors.border,
            extendedProps: {
              bookingId: booking.id,
              clientName: booking.client?.name || 'Unknown',
              clientEmail: booking.client?.email || '',
              serviceName: booking.service?.name || 'Unknown',
              providerName: booking.provider?.name || 'Unknown',
              status: booking.status,
            },
          };
        });

        setEvents(calendarEvents);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (info: EventClickArg) => {
    const props = info.event.extendedProps;
    setSelectedBooking({
      id: props.bookingId as string,
      clientName: props.clientName as string,
      clientEmail: props.clientEmail as string,
      clientPhone: '',
      serviceName: props.serviceName as string,
      providerName: props.providerName as string,
      date: info.event.start?.toLocaleDateString() || '',
      time: info.event.start?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '',
      duration: info.event.end && info.event.start 
        ? Math.round((info.event.end.getTime() - info.event.start.getTime()) / 60000)
        : 60,
      status: props.status as string,
    });
  };

  const handleDateSelect = (info: DateSelectArg) => {
    console.log('Date selected:', info.startStr, info.endStr);
  };

  const navigateCalendar = (direction: 'prev' | 'next' | 'today') => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      if (direction === 'prev') calendarApi.prev();
      else if (direction === 'next') calendarApi.next();
      else calendarApi.today();
      setCurrentDate(calendarApi.getDate());
    }
  };

  const changeView = (view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView(view);
      setCurrentView(view);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      CONFIRMED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Confirmed' },
      ARRIVED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Arrived' },
      COMPLETED: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Completed' },
      CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
      NO_SHOW: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'No Show' },
    };
    const config = statusConfig[status] || statusConfig.CONFIRMED;
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
          <p className="text-slate-500 mt-1">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Switcher */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            {[
              { view: 'dayGridMonth' as const, label: 'Month' },
              { view: 'timeGridWeek' as const, label: 'Week' },
              { view: 'timeGridDay' as const, label: 'Day' },
            ].map(({ view, label }) => (
              <button
                key={view}
                onClick={() => changeView(view)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  currentView === view
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateCalendar('prev')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <button
              onClick={() => navigateCalendar('today')}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigateCalendar('next')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <style jsx global>{`
          .fc {
            --fc-border-color: #e2e8f0;
            --fc-button-bg-color: #3b82f6;
            --fc-button-border-color: #3b82f6;
            --fc-button-hover-bg-color: #2563eb;
            --fc-button-hover-border-color: #2563eb;
            --fc-today-bg-color: #eff6ff;
          }
          .fc .fc-toolbar-title {
            font-size: 1.25rem;
            font-weight: 600;
          }
          .fc .fc-col-header-cell-cushion {
            padding: 8px;
            font-weight: 500;
            color: #64748b;
          }
          .fc .fc-daygrid-day-number {
            padding: 8px;
            color: #334155;
          }
          .fc .fc-event {
            border-radius: 6px;
            padding: 2px 4px;
            font-size: 0.75rem;
            cursor: pointer;
          }
          .fc .fc-timegrid-slot {
            height: 48px;
          }
          .fc .fc-timegrid-slot-label-cushion {
            color: #64748b;
            font-size: 0.75rem;
          }
          .fc-theme-standard .fc-scrollgrid {
            border: none;
          }
          .fc .fc-scrollgrid-section > * {
            border: none;
          }
          .fc-toolbar {
            display: none !important;
          }
        `}</style>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={currentView}
          headerToolbar={false}
          events={events}
          eventClick={handleEventClick}
          select={handleDateSelect}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={3}
          weekends={true}
          nowIndicator={true}
          slotMinTime="07:00:00"
          slotMaxTime="21:00:00"
          allDaySlot={false}
          height="auto"
          aspectRatio={1.8}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-slate-500">Status:</span>
        {[
          { color: 'bg-blue-500', label: 'Confirmed' },
          { color: 'bg-emerald-500', label: 'Arrived' },
          { color: 'bg-slate-500', label: 'Completed' },
          { color: 'bg-amber-500', label: 'No Show' },
          { color: 'bg-red-500', label: 'Cancelled' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${color}`} />
            <span className="text-slate-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Booking Details Slide-out */}
      <AnimatePresence>
        {selectedBooking && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setSelectedBooking(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-slate-900">Booking Details</h2>
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Status</span>
                    {getStatusBadge(selectedBooking.status)}
                  </div>

                  {/* Client Info */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{selectedBooking.clientName}</p>
                        <p className="text-sm text-slate-500">{selectedBooking.clientEmail}</p>
                      </div>
                    </div>
                  </div>

                  {/* Service & Provider */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-500">Service</p>
                        <p className="font-medium text-slate-900">{selectedBooking.serviceName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-500">Provider</p>
                        <p className="font-medium text-slate-900">{selectedBooking.providerName}</p>
                      </div>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-slate-900">{selectedBooking.date}</p>
                        <p className="text-sm text-slate-500">
                          {selectedBooking.time} • {selectedBooking.duration} min
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-medium transition-colors">
                      Reschedule
                    </button>
                    <button className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-xl font-medium transition-colors">
                      Cancel
                    </button>
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
