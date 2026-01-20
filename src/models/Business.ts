import mongoose, { Schema, Document } from 'mongoose';

export interface IBusiness extends Document {
  name: string;
  email: string;
  phone: string;
  address: string;
  website?: string;
  timezone: string;
  logo_url?: string;
  settings: {
    slots_per_hour: number;
    default_buffer_before: number;
    default_buffer_after: number;
    max_advance_booking_days: number;
    min_lead_time_hours: number;
    working_hours: Record<string, {
      enabled: boolean;
      start: string;
      end: string;
      breaks?: { start: string; end: string }[];
    }>;
    google_review_url?: string;
    review_delay_hours: number;
    rooms_available: number;
  };
  is_deleted: boolean;
  deleted_at?: Date;
  deleted_by?: mongoose.Types.ObjectId;
  deletion_reason?: string;
  created_at: Date;
  updated_at: Date;
}

const defaultWorkingHours = {
  monday: { enabled: true, start: '09:00', end: '17:00' },
  tuesday: { enabled: true, start: '09:00', end: '17:00' },
  wednesday: { enabled: true, start: '09:00', end: '17:00' },
  thursday: { enabled: true, start: '09:00', end: '17:00' },
  friday: { enabled: true, start: '09:00', end: '17:00' },
  saturday: { enabled: false, start: '09:00', end: '13:00' },
  sunday: { enabled: false, start: '09:00', end: '13:00' },
};

const BusinessSchema = new Schema<IBusiness>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    website: { type: String, trim: true },
    timezone: { type: String, default: 'Europe/Bucharest' },
    logo_url: { type: String },
    settings: {
      slots_per_hour: { type: Number, default: 1 },
      default_buffer_before: { type: Number, default: 0 },
      default_buffer_after: { type: Number, default: 15 },
      max_advance_booking_days: { type: Number, default: 30 },
      min_lead_time_hours: { type: Number, default: 2 },
      working_hours: { type: Schema.Types.Mixed, default: defaultWorkingHours },
      google_review_url: { type: String },
      review_delay_hours: { type: Number, default: 2 },
      rooms_available: { type: Number, default: 1 },
    },
    is_deleted: { type: Boolean, default: false, index: true },
    deleted_at: { type: Date },
    deleted_by: { type: Schema.Types.ObjectId },
    deletion_reason: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

BusinessSchema.index({ email: 1 }, { unique: true });

export const Business = mongoose.models.Business || mongoose.model<IBusiness>('Business', BusinessSchema);
