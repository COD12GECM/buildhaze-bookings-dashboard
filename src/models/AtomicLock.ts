import mongoose, { Schema, Document } from 'mongoose';

export interface IAtomicLock extends Document {
  business_id: mongoose.Types.ObjectId;
  provider_id: mongoose.Types.ObjectId;
  date: string;
  time_start: string;
  time_end: string;
  room_ids?: mongoose.Types.ObjectId[];
  created_at: Date;
  expires_at: Date;
  created_by: mongoose.Types.ObjectId;
  idempotency_key: string;
}

const AtomicLockSchema = new Schema<IAtomicLock>(
  {
    business_id: { type: Schema.Types.ObjectId, required: true, index: true },
    provider_id: { type: Schema.Types.ObjectId, required: true, index: true },
    date: { type: String, required: true },
    time_start: { type: String, required: true },
    time_end: { type: String, required: true },
    room_ids: [{ type: Schema.Types.ObjectId }],
    created_at: { type: Date, default: Date.now },
    expires_at: { type: Date, required: true, index: true },
    created_by: { type: Schema.Types.ObjectId, required: true },
    idempotency_key: { type: String, required: true, unique: true },
  }
);

// TTL index - automatically delete expired locks
AtomicLockSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// Compound index for lock queries
AtomicLockSchema.index({ provider_id: 1, date: 1, time_start: 1, time_end: 1 });

export const AtomicLock = mongoose.models.AtomicLock || mongoose.model<IAtomicLock>('AtomicLock', AtomicLockSchema);
