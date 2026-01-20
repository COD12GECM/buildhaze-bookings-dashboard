import mongoose, { Schema, Document } from 'mongoose';

export interface IService extends Document {
  business_id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  duration: number;
  price: number;
  buffer_before: number;
  buffer_after: number;
  min_lead_time_hours: number;
  max_advance_booking_days: number;
  rooms_required: number;
  is_enabled: boolean;
  available_days: string[];
  available_hours?: { start: string; end: string };
  frequency_limit?: {
    per_client_days?: number;
  };
  color?: string;
  version: number;
  is_deleted: boolean;
  deleted_at?: Date;
  deleted_by?: mongoose.Types.ObjectId;
  deletion_reason?: string;
  created_at: Date;
  updated_at: Date;
}

const ServiceSchema = new Schema<IService>(
  {
    business_id: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    duration: { type: Number, required: true, default: 60 },
    price: { type: Number, required: true, default: 0 },
    buffer_before: { type: Number, default: 0 },
    buffer_after: { type: Number, default: 15 },
    min_lead_time_hours: { type: Number, default: 2 },
    max_advance_booking_days: { type: Number, default: 30 },
    rooms_required: { type: Number, default: 1 },
    is_enabled: { type: Boolean, default: true, index: true },
    available_days: { 
      type: [String], 
      default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] 
    },
    available_hours: {
      start: { type: String },
      end: { type: String },
    },
    frequency_limit: {
      per_client_days: { type: Number },
    },
    color: { type: String, default: '#10b981' },
    version: { type: Number, default: 1 },
    is_deleted: { type: Boolean, default: false, index: true },
    deleted_at: { type: Date },
    deleted_by: { type: Schema.Types.ObjectId },
    deletion_reason: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

ServiceSchema.index({ business_id: 1, name: 1 }, { unique: true });
ServiceSchema.index({ business_id: 1, is_deleted: 1, is_enabled: 1 });

// Increment version on update
ServiceSchema.pre('save', function() {
  if (this.isModified() && !this.isNew) {
    this.version += 1;
  }
});

export const Service = mongoose.models.Service || mongoose.model<IService>('Service', ServiceSchema);
