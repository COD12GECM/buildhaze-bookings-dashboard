import mongoose, { Schema, Document } from 'mongoose';

export interface ISuperAdmin extends Document {
  email: string;
  email_hash: string;
  password_hash: string;
  name: string;
  permissions: {
    can_create_businesses: boolean;
    can_ghost_login: boolean;
    can_view_all_data: boolean;
    can_manage_platform: boolean;
  };
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

const SuperAdminSchema = new Schema<ISuperAdmin>(
  {
    email: {
      type: String,
      required: true,
    },
    email_hash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    password_hash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    permissions: {
      can_create_businesses: { type: Boolean, default: true },
      can_ghost_login: { type: Boolean, default: true },
      can_view_all_data: { type: Boolean, default: true },
      can_manage_platform: { type: Boolean, default: true },
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    last_login: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'super_admins',
  }
);

export const SuperAdmin =
  mongoose.models.SuperAdmin ||
  mongoose.model<ISuperAdmin>('SuperAdmin', SuperAdminSchema);
