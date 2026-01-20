import mongoose, { Schema, Document } from 'mongoose';
import { BookingStatus, LeadSource, SyncStatus } from '@/types';

export interface IBooking extends Document {
  id: number; // Legacy ID for booking-api compatibility
  business_id: mongoose.Types.ObjectId;
  
  // Time
  date: string;
  time: string;
  utc_start: Date;
  utc_end: Date;
  
  // Service snapshot
  service_id: mongoose.Types.ObjectId;
  service_snapshot: {
    name: string;
    duration: number;
    price: number;
    buffer_before: number;
    buffer_after: number;
  };
  
  // Provider
  provider_id: mongoose.Types.ObjectId;
  provider_name: string;
  
  // Client
  client_id: mongoose.Types.ObjectId;
  client_name: string;
  client_email_encrypted: string;
  client_email_hash: string;
  client_phone_encrypted?: string;
  client_phone_hash?: string;
  
  // Status
  status: BookingStatus;
  requires_resolution: boolean;
  resolution_reason?: string;
  
  // Metadata
  lead_source: LeadSource;
  notes?: string;
  cancel_token: string;
  cancellation_reason?: string;
  cancelled_by?: mongoose.Types.ObjectId;
  cancelled_at?: Date;
  
  // External sync
  sync_status: SyncStatus;
  external_event_id?: string;
  sync_retries: number;
  last_sync_attempt?: Date;
  
  // Review
  review_request_sent: boolean;
  review_sent_at?: Date;
  review_rating?: number;
  review_feedback?: string;
  
  // Clinic info (booking-api compatibility)
  clinicName?: string;
  clinicEmail?: string;
  clinicPhone?: string;
  clinicAddress?: string;
  websiteUrl?: string;
  
  // For booking-api compatibility
  name?: string;
  email?: string;
  phone?: string;
  service?: string;
  teamMemberId?: string;
  teamMemberName?: string;
  
  version: number;
  created_at: Date;
  updated_at: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    id: { type: Number, required: true, index: true },
    business_id: { type: Schema.Types.ObjectId, index: true },
    
    date: { type: String, required: true, index: true },
    time: { type: String, required: true },
    utc_start: { type: Date, index: true },
    utc_end: { type: Date },
    
    service_id: { type: Schema.Types.ObjectId, ref: 'Service' },
    service_snapshot: {
      name: { type: String },
      duration: { type: Number },
      price: { type: Number },
      buffer_before: { type: Number },
      buffer_after: { type: Number },
    },
    
    provider_id: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    provider_name: { type: String },
    
    client_id: { type: Schema.Types.ObjectId, ref: 'Client' },
    client_name: { type: String },
    client_email_encrypted: { type: String },
    client_email_hash: { type: String, index: true },
    client_phone_encrypted: { type: String },
    client_phone_hash: { type: String, index: true },
    
    status: { 
      type: String, 
      enum: Object.values(BookingStatus),
      default: BookingStatus.CONFIRMED,
      index: true 
    },
    requires_resolution: { type: Boolean, default: false, index: true },
    resolution_reason: { type: String },
    
    lead_source: { 
      type: String, 
      enum: Object.values(LeadSource),
      default: LeadSource.SHOPIFY 
    },
    notes: { type: String },
    cancel_token: { type: String, index: true },
    cancellation_reason: { type: String },
    cancelled_by: { type: Schema.Types.ObjectId },
    cancelled_at: { type: Date },
    
    sync_status: { 
      type: String, 
      enum: Object.values(SyncStatus),
      default: SyncStatus.SYNCED 
    },
    external_event_id: { type: String },
    sync_retries: { type: Number, default: 0 },
    last_sync_attempt: { type: Date },
    
    review_request_sent: { type: Boolean, default: false },
    review_sent_at: { type: Date },
    review_rating: { type: Number },
    review_feedback: { type: String },
    
    // Booking-api compatibility fields
    clinicName: { type: String },
    clinicEmail: { type: String, index: true },
    clinicPhone: { type: String },
    clinicAddress: { type: String },
    websiteUrl: { type: String },
    name: { type: String },
    email: { type: String },
    phone: { type: String },
    service: { type: String },
    teamMemberId: { type: String },
    teamMemberName: { type: String },
    
    version: { type: Number, default: 1 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'bookings', // Use same collection as booking-api
  }
);

// Indexes for availability queries
BookingSchema.index({ date: 1, time: 1 });
BookingSchema.index({ provider_id: 1, date: 1, status: 1 });
BookingSchema.index({ business_id: 1, date: 1, status: 1 });
BookingSchema.index({ clinicEmail: 1, date: 1, time: 1 });

export const Booking = mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);
