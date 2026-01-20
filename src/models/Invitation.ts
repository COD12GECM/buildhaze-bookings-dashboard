import mongoose, { Schema, Document, Types } from 'mongoose';

export enum InvitationType {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  PROVIDER = 'PROVIDER',
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

export enum InviterType {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
}

export interface IInvitation extends Document {
  business_id?: Types.ObjectId;
  type: InvitationType;
  email: string;
  email_hash: string;
  code: string;
  name: string;
  role_config: {
    services?: Types.ObjectId[];
    permissions?: {
      can_view_all_bookings?: boolean;
      can_create_bookings?: boolean;
      can_modify_bookings?: boolean;
      can_cancel_bookings?: boolean;
      can_manage_services?: boolean;
      can_manage_team?: boolean;
      can_view_analytics?: boolean;
      can_export_data?: boolean;
      can_edit_templates?: boolean;
      can_drag_drop_calendar?: boolean;
    };
    working_hours?: {
      [key: string]: {
        enabled: boolean;
        start: string;
        end: string;
      };
    };
    booking_limits?: {
      max_per_day?: number;
      max_per_week?: number;
    };
  };
  invited_by: Types.ObjectId;
  invited_by_type: InviterType;
  status: InvitationStatus;
  expires_at: Date;
  accepted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    business_id: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(InvitationType),
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    email_hash: {
      type: String,
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    role_config: {
      services: [{ type: Schema.Types.ObjectId, ref: 'Service' }],
      permissions: {
        can_view_all_bookings: { type: Boolean },
        can_create_bookings: { type: Boolean },
        can_modify_bookings: { type: Boolean },
        can_cancel_bookings: { type: Boolean },
        can_manage_services: { type: Boolean },
        can_manage_team: { type: Boolean },
        can_view_analytics: { type: Boolean },
        can_export_data: { type: Boolean },
        can_edit_templates: { type: Boolean },
        can_drag_drop_calendar: { type: Boolean },
      },
      working_hours: { type: Schema.Types.Mixed },
      booking_limits: {
        max_per_day: { type: Number },
        max_per_week: { type: Number },
      },
    },
    invited_by: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    invited_by_type: {
      type: String,
      enum: Object.values(InviterType),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(InvitationStatus),
      default: InvitationStatus.PENDING,
    },
    expires_at: {
      type: Date,
      required: true,
      index: true,
    },
    accepted_at: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'invitations',
  }
);

// Compound index for checking existing invitations
InvitationSchema.index({ email_hash: 1, status: 1 });
InvitationSchema.index({ business_id: 1, status: 1 });

export const Invitation =
  mongoose.models.Invitation ||
  mongoose.model<IInvitation>('Invitation', InvitationSchema);
