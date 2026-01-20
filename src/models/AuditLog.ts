import mongoose, { Schema, Document } from 'mongoose';
import { AuditAction, UserRole } from '@/types';

export interface IAuditLog extends Document {
  business_id: mongoose.Types.ObjectId;
  entity_type: 'booking' | 'service' | 'user' | 'client' | 'business';
  entity_id: mongoose.Types.ObjectId;
  action: AuditAction;
  performed_by: mongoose.Types.ObjectId;
  performed_by_role: UserRole | 'system';
  previous_state?: Record<string, unknown>;
  new_state?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  created_at: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    business_id: { type: Schema.Types.ObjectId, required: true, index: true },
    entity_type: { 
      type: String, 
      enum: ['booking', 'service', 'user', 'client', 'business'],
      required: true,
      index: true 
    },
    entity_id: { type: Schema.Types.ObjectId, required: true, index: true },
    action: { 
      type: String, 
      enum: Object.values(AuditAction),
      required: true,
      index: true 
    },
    performed_by: { type: Schema.Types.ObjectId, required: true },
    performed_by_role: { 
      type: String, 
      enum: [...Object.values(UserRole), 'system'],
      required: true 
    },
    previous_state: { type: Schema.Types.Mixed },
    new_state: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
    ip_address: { type: String },
    created_at: { type: Date, default: Date.now, index: true },
  }
);

// Compound indexes for common queries
AuditLogSchema.index({ business_id: 1, created_at: -1 });
AuditLogSchema.index({ entity_type: 1, entity_id: 1, created_at: -1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
