import mongoose, { Schema, Document, Types } from 'mongoose';

export enum BehaviorTag {
  VIP = 'VIP',
  REGULAR = 'REGULAR',
  RISK = 'RISK',
  NEW = 'NEW',
}

export interface IClientIdentifier {
  type: 'EMAIL' | 'PHONE';
  value_encrypted: string;
  value_hash: string;
  added_at: Date;
}

export interface IClientNoteHistory {
  content: string;
  changed_by: Types.ObjectId;
  changed_at: Date;
}

export interface IClient extends Document {
  business_id: Types.ObjectId;
  identifiers: IClientIdentifier[];
  name: string;
  notes?: string;
  notes_history: IClientNoteHistory[];
  meta_stats: {
    total_bookings: number;
    completed: number;
    no_shows: number;
    cancellations: number;
    first_visit?: Date;
    last_visit?: Date;
  };
  behavior_tag: BehaviorTag;
  internal_flag: boolean;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    business_id: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    identifiers: [
      {
        type: {
          type: String,
          enum: ['EMAIL', 'PHONE'],
          required: true,
        },
        value_encrypted: {
          type: String,
          required: true,
        },
        value_hash: {
          type: String,
          required: true,
        },
        added_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    name: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
    },
    notes_history: [
      {
        content: { type: String },
        changed_by: { type: Schema.Types.ObjectId, ref: 'User' },
        changed_at: { type: Date },
      },
    ],
    meta_stats: {
      total_bookings: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      no_shows: { type: Number, default: 0 },
      cancellations: { type: Number, default: 0 },
      first_visit: { type: Date },
      last_visit: { type: Date },
    },
    behavior_tag: {
      type: String,
      enum: Object.values(BehaviorTag),
      default: BehaviorTag.NEW,
    },
    internal_flag: {
      type: Boolean,
      default: false,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'clients',
  }
);

// Index for identifier lookup
ClientSchema.index({ 'identifiers.value_hash': 1, business_id: 1 });
ClientSchema.index({ business_id: 1, is_deleted: 1 });
ClientSchema.index({ business_id: 1, behavior_tag: 1 });

// Soft delete middleware
ClientSchema.pre('find', function () {
  const query = this.getQuery();
  if (query.is_deleted === undefined) {
    this.where({ is_deleted: false });
  }
});

ClientSchema.pre('findOne', function () {
  const query = this.getQuery();
  if (query.is_deleted === undefined) {
    this.where({ is_deleted: false });
  }
});

export const Client =
  mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema);
