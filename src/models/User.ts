import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '@/types';

export interface IUser extends Document {
  business_id: mongoose.Types.ObjectId;
  email: string;
  email_hash: string;
  password_hash: string;
  name: string;
  role: UserRole;
  permissions: {
    can_view_all_bookings: boolean;
    can_create_bookings: boolean;
    can_modify_bookings: boolean;
    can_cancel_bookings: boolean;
    can_manage_services: boolean;
    can_manage_team: boolean;
    can_view_analytics: boolean;
    can_export_data: boolean;
    can_edit_templates: boolean;
    can_drag_drop_calendar: boolean;
  };
  service_ids: mongoose.Types.ObjectId[];
  working_hours?: Record<string, {
    enabled: boolean;
    start: string;
    end: string;
    breaks?: { start: string; end: string }[];
  }>;
  booking_limits?: {
    max_per_day?: number;
    max_per_week?: number;
    per_service?: Record<string, { max_per_day?: number; max_per_week?: number }>;
  };
  calendar_sync?: {
    provider: 'google' | 'outlook' | 'apple';
    access_token_encrypted: string;
    refresh_token_encrypted: string;
    token_expires_at: Date;
    calendar_id: string;
    last_sync_at?: Date;
    sync_enabled: boolean;
  };
  is_active: boolean;
  must_change_password: boolean;
  last_login?: Date;
  color?: string;
  is_deleted: boolean;
  deleted_at?: Date;
  deleted_by?: mongoose.Types.ObjectId;
  deletion_reason?: string;
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUser>(
  {
    business_id: { type: Schema.Types.ObjectId, required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    email_hash: { type: String, required: true, index: true },
    password_hash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { 
      type: String, 
      enum: Object.values(UserRole), 
      required: true,
      index: true 
    },
    permissions: {
      can_view_all_bookings: { type: Boolean, default: false },
      can_create_bookings: { type: Boolean, default: false },
      can_modify_bookings: { type: Boolean, default: false },
      can_cancel_bookings: { type: Boolean, default: false },
      can_manage_services: { type: Boolean, default: false },
      can_manage_team: { type: Boolean, default: false },
      can_view_analytics: { type: Boolean, default: false },
      can_export_data: { type: Boolean, default: false },
      can_edit_templates: { type: Boolean, default: false },
      can_drag_drop_calendar: { type: Boolean, default: false },
    },
    service_ids: [{ type: Schema.Types.ObjectId, ref: 'Service' }],
    working_hours: { type: Schema.Types.Mixed },
    booking_limits: { type: Schema.Types.Mixed },
    calendar_sync: { type: Schema.Types.Mixed },
    is_active: { type: Boolean, default: true, index: true },
    must_change_password: { type: Boolean, default: true },
    last_login: { type: Date },
    color: { type: String, default: '#3b82f6' },
    is_deleted: { type: Boolean, default: false, index: true },
    deleted_at: { type: Date },
    deleted_by: { type: Schema.Types.ObjectId },
    deletion_reason: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Compound indexes
UserSchema.index({ business_id: 1, email_hash: 1 }, { unique: true });
UserSchema.index({ business_id: 1, is_deleted: 1, is_active: 1 });

// Global query middleware for soft delete
UserSchema.pre('find', function() {
  const query = this.getQuery();
  if (!query.includeDeleted) {
    this.where({ is_deleted: false });
  }
});

UserSchema.pre('findOne', function() {
  const query = this.getQuery();
  if (!query.includeDeleted) {
    this.where({ is_deleted: false });
  }
});

// Default permissions by role
export function getDefaultPermissions(role: UserRole) {
  switch (role) {
    case UserRole.ADMIN:
      return {
        can_view_all_bookings: true,
        can_create_bookings: true,
        can_modify_bookings: true,
        can_cancel_bookings: true,
        can_manage_services: true,
        can_manage_team: true,
        can_view_analytics: true,
        can_export_data: true,
        can_edit_templates: true,
        can_drag_drop_calendar: true,
      };
    case UserRole.STAFF:
      return {
        can_view_all_bookings: true,
        can_create_bookings: true,
        can_modify_bookings: true,
        can_cancel_bookings: true,
        can_manage_services: false,
        can_manage_team: false,
        can_view_analytics: false,
        can_export_data: false,
        can_edit_templates: false,
        can_drag_drop_calendar: false,
      };
    case UserRole.PROVIDER:
      return {
        can_view_all_bookings: false,
        can_create_bookings: true, // Only for self
        can_modify_bookings: false,
        can_cancel_bookings: false,
        can_manage_services: false,
        can_manage_team: false,
        can_view_analytics: false,
        can_export_data: false,
        can_edit_templates: false,
        can_drag_drop_calendar: false,
      };
  }
}

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
