/**
 * ATOMIC LOCK SYSTEM
 * 
 * Prevents race conditions when multiple actors attempt to book the same slot.
 * 
 * Rules:
 * - Lock is created when booking flow starts
 * - Lock TTL: 60 seconds
 * - Lock is released on: confirmation, cancellation, or TTL expiration
 * - Blocks all actors (Admin, Staff, Provider, System)
 */

import { connectDB, getDashboardDB } from './db';
import { v4 as uuidv4 } from 'uuid';

const LOCK_TTL_SECONDS = 60;

export interface LockParams {
  businessId: string;
  providerId: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  roomIds?: string[];
  createdBy: string;
  idempotencyKey?: string;
}

export interface LockResult {
  success: boolean;
  lockId?: string;
  error?: string;
  existingLock?: {
    createdBy: string;
    expiresAt: Date;
  };
}

/**
 * Acquire an atomic lock for a time slot
 */
export async function acquireLock(params: LockParams): Promise<LockResult> {
  await connectDB();
  const db = getDashboardDB();
  
  const idempotencyKey = params.idempotencyKey || uuidv4();
  const expiresAt = new Date(Date.now() + LOCK_TTL_SECONDS * 1000);

  try {
    // Check for existing lock
    const existingLock = await db.collection('atomic_locks').findOne({
      provider_id: params.providerId,
      date: params.date,
      $or: [
        {
          time_start: { $lt: params.timeEnd },
          time_end: { $gt: params.timeStart },
        },
      ],
      expires_at: { $gt: new Date() },
    });

    if (existingLock) {
      // Check if it's the same idempotency key (retry of same request)
      if (existingLock.idempotency_key === idempotencyKey) {
        return {
          success: true,
          lockId: existingLock._id.toString(),
        };
      }

      return {
        success: false,
        error: 'SLOT_LOCKED',
        existingLock: {
          createdBy: existingLock.created_by,
          expiresAt: existingLock.expires_at,
        },
      };
    }

    // Create new lock
    const result = await db.collection('atomic_locks').insertOne({
      business_id: params.businessId,
      provider_id: params.providerId,
      date: params.date,
      time_start: params.timeStart,
      time_end: params.timeEnd,
      room_ids: params.roomIds || [],
      created_at: new Date(),
      expires_at: expiresAt,
      created_by: params.createdBy,
      idempotency_key: idempotencyKey,
    });

    return {
      success: true,
      lockId: result.insertedId.toString(),
    };
  } catch (error: unknown) {
    // Handle duplicate key error (race condition)
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return {
        success: false,
        error: 'SLOT_LOCKED',
      };
    }
    throw error;
  }
}

/**
 * Release an atomic lock
 */
export async function releaseLock(lockId: string): Promise<boolean> {
  await connectDB();
  const db = getDashboardDB();

  const { ObjectId } = await import('mongodb');
  
  const result = await db.collection('atomic_locks').deleteOne({
    _id: new ObjectId(lockId),
  });

  return result.deletedCount > 0;
}

/**
 * Release lock by idempotency key
 */
export async function releaseLockByKey(idempotencyKey: string): Promise<boolean> {
  await connectDB();
  const db = getDashboardDB();

  const result = await db.collection('atomic_locks').deleteOne({
    idempotency_key: idempotencyKey,
  });

  return result.deletedCount > 0;
}

/**
 * Check if a slot is currently locked
 */
export async function isSlotLocked(params: {
  providerId: string;
  date: string;
  timeStart: string;
  timeEnd: string;
}): Promise<boolean> {
  await connectDB();
  const db = getDashboardDB();

  const lock = await db.collection('atomic_locks').findOne({
    provider_id: params.providerId,
    date: params.date,
    time_start: { $lt: params.timeEnd },
    time_end: { $gt: params.timeStart },
    expires_at: { $gt: new Date() },
  });

  return !!lock;
}

/**
 * Clean up expired locks (called by Global Watcher)
 */
export async function cleanupExpiredLocks(): Promise<number> {
  await connectDB();
  const db = getDashboardDB();

  const result = await db.collection('atomic_locks').deleteMany({
    expires_at: { $lt: new Date() },
  });

  return result.deletedCount;
}

/**
 * Extend lock TTL (for long operations)
 */
export async function extendLock(lockId: string, additionalSeconds: number = 30): Promise<boolean> {
  await connectDB();
  const db = getDashboardDB();

  const { ObjectId } = await import('mongodb');
  
  const result = await db.collection('atomic_locks').updateOne(
    { _id: new ObjectId(lockId) },
    { $set: { expires_at: new Date(Date.now() + additionalSeconds * 1000) } }
  );

  return result.modifiedCount > 0;
}
