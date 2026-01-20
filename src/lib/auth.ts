/**
 * AUTHENTICATION LIBRARY
 * 
 * Handles JWT tokens, password hashing, and session management.
 * All permissions are evaluated server-side.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { connectDB, getDashboardDB } from './db';
import { UserRole } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'buildhaze-jwt-secret-2024';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// Token expiration
const ACCESS_TOKEN_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  userId: string;
  businessId: string;
  email: string;
  role: UserRole;
  permissions: Record<string, boolean>;
}

export interface AuthUser {
  id: string;
  businessId: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Record<string, boolean>;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT access token
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Generate a JWT refresh token
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Get current authenticated user from cookies
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  // Fetch fresh user data from database
  await connectDB();
  const db = getDashboardDB();
  
  const { ObjectId } = await import('mongodb');
  const user = await db.collection('users').findOne({
    _id: new ObjectId(payload.userId),
    is_deleted: false,
    is_active: true,
  });

  if (!user) {
    return null;
  }

  return {
    id: user._id.toString(),
    businessId: user.business_id.toString(),
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    permissions: user.permissions,
  };
}

/**
 * Set authentication cookie
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}

/**
 * Clear authentication cookie
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}

/**
 * Hash an email for indexed lookup (SHA-256)
 */
export function hashEmail(email: string): string {
  return crypto
    .createHash('sha256')
    .update(email.toLowerCase().trim())
    .digest('hex');
}

/**
 * Encrypt sensitive data (AES-256-GCM)
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data (AES-256-GCM)
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Check if user has permission for an action
 */
export function hasPermission(user: AuthUser, permission: string): boolean {
  // Admin has all permissions
  if (user.role === UserRole.ADMIN) {
    return true;
  }
  
  return user.permissions[permission] === true;
}

/**
 * Check if user can access a resource (scope check)
 */
export function canAccessResource(user: AuthUser, resourceOwnerId: string): boolean {
  // Admin and Staff can access all resources
  if (user.role === UserRole.ADMIN || user.role === UserRole.STAFF) {
    return true;
  }
  
  // Provider can only access own resources
  return user.id === resourceOwnerId;
}

/**
 * Middleware helper to require authentication
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

/**
 * Middleware helper to require specific role
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<AuthUser> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

/**
 * Middleware helper to require specific permission
 */
export async function requirePermission(permission: string): Promise<AuthUser> {
  const user = await requireAuth();
  if (!hasPermission(user, permission)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}
