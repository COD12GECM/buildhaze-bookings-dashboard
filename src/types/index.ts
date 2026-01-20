// ============================================
// ENUMS & CONSTANTS
// ============================================

export enum UserRole {
  ADMIN = 'admin',
  STAFF = 'staff',
  PROVIDER = 'provider',
}

export enum BookingStatus {
  CONFIRMED = 'confirmed',
  ARRIVED = 'arrived',
  COMPLETED = 'completed',
  NO_SHOW = 'no-show',
  CANCELLED = 'cancelled',
}

export enum LeadSource {
  AI_CHAT = 'ai_chat',
  DIRECT_LINK = 'direct_link',
  MANUAL_STAFF = 'manual_staff',
  PROVIDER_SELF = 'provider_self',
  ADMIN_MANUAL = 'admin_manual',
  SHOPIFY = 'shopify',
}

export enum SyncStatus {
  SYNCED = 'synced',
  PENDING_RETRY = 'pending_retry',
  FAILED = 'failed',
}

export enum ClientBehaviorTag {
  VIP = 'vip',
  REGULAR = 'regular',
  RISK = 'risk',
  NEW = 'new',
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  STATUS_CHANGE = 'status_change',
  LOGIN = 'login',
  LOGOUT = 'logout',
}

// ============================================
// BASE INTERFACES
// ============================================

export interface SoftDeleteFields {
  is_deleted: boolean;
  deleted_at?: Date;
  deleted_by?: string;
  deletion_reason?: string;
}

export interface TimestampFields {
  created_at: Date;
  updated_at: Date;
}

export interface VersionedFields {
  version: number;
}

// ============================================
// BUSINESS
// ============================================

export interface Business extends SoftDeleteFields, TimestampFields {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  website?: string;
  timezone: string; // Canonical business timezone
  logo_url?: string;
  settings: BusinessSettings;
}

export interface BusinessSettings {
  slots_per_hour: number;
  default_buffer_before: number; // minutes
  default_buffer_after: number; // minutes
  max_advance_booking_days: number;
  min_lead_time_hours: number;
  working_hours: WorkingHours;
  google_review_url?: string;
  review_delay_hours: number;
}

export interface WorkingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  enabled: boolean;
  start: string; // HH:MM
  end: string; // HH:MM
  breaks?: { start: string; end: string }[];
}

// ============================================
// USER & PERMISSIONS
// ============================================

export interface User extends SoftDeleteFields, TimestampFields {
  _id: string;
  business_id: string;
  email: string;
  email_hash: string; // For lookup
  password_hash: string;
  name: string;
  role: UserRole;
  permissions: UserPermissions;
  service_ids: string[]; // Services this provider can perform
  working_hours?: WorkingHours;
  booking_limits?: BookingLimits;
  calendar_sync?: CalendarSync;
  is_active: boolean;
  must_change_password: boolean;
  last_login?: Date;
  color?: string; // For calendar display
}

export interface UserPermissions {
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
}

export interface BookingLimits {
  max_per_day?: number;
  max_per_week?: number;
  per_service?: { [serviceId: string]: { max_per_day?: number; max_per_week?: number } };
}

export interface CalendarSync {
  provider: 'google' | 'outlook' | 'apple';
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: Date;
  calendar_id: string;
  last_sync_at?: Date;
  sync_enabled: boolean;
}

// ============================================
// SERVICE
// ============================================

export interface Service extends SoftDeleteFields, TimestampFields, VersionedFields {
  _id: string;
  business_id: string;
  name: string;
  description?: string;
  duration: number; // minutes
  price: number;
  buffer_before: number; // minutes
  buffer_after: number; // minutes
  min_lead_time_hours: number;
  max_advance_booking_days: number;
  rooms_required: number;
  is_enabled: boolean;
  available_days: string[]; // ['monday', 'tuesday', ...]
  available_hours?: { start: string; end: string };
  frequency_limit?: {
    per_client_days?: number; // Min days between same service for same client
  };
  color?: string;
}

// ============================================
// PROVIDER-SERVICE ELIGIBILITY
// ============================================

export interface ProviderService extends TimestampFields {
  _id: string;
  business_id: string;
  provider_id: string;
  service_id: string;
  is_enabled: boolean;
  custom_duration?: number;
  custom_price?: number;
  effective_from: Date;
  effective_until?: Date;
}

// ============================================
// BOOKING
// ============================================

export interface Booking extends TimestampFields, VersionedFields {
  _id: string;
  id: number; // Legacy ID for compatibility with booking-api
  business_id: string;
  
  // Time (stored in UTC)
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  utc_start: Date;
  utc_end: Date;
  
  // Service snapshot (frozen at booking time)
  service_id: string;
  service_snapshot: {
    name: string;
    duration: number;
    price: number;
    buffer_before: number;
    buffer_after: number;
  };
  
  // Provider
  provider_id: string;
  provider_name: string;
  
  // Client
  client_id: string;
  client_name: string;
  client_email_encrypted: string;
  client_email_hash: string;
  client_phone_encrypted?: string;
  client_phone_hash?: string;
  
  // Status
  status: BookingStatus;
  requires_resolution: boolean;
  resolution_reason?: string;
  
  // Metadata
  lead_source: LeadSource;
  notes?: string;
  cancel_token: string;
  cancellation_reason?: string;
  cancelled_by?: string;
  cancelled_at?: Date;
  
  // External sync
  sync_status: SyncStatus;
  external_event_id?: string;
  sync_retries: number;
  last_sync_attempt?: Date;
  
  // Review
  review_request_sent: boolean;
  review_sent_at?: Date;
  review_rating?: number;
  review_feedback?: string;
  
  // Clinic info (for emails - from booking-api compatibility)
  clinicName?: string;
  clinicEmail?: string;
  clinicPhone?: string;
  clinicAddress?: string;
  websiteUrl?: string;
}

// ============================================
// CLIENT
// ============================================

export interface Client extends SoftDeleteFields, TimestampFields {
  _id: string;
  business_id: string;
  
  // Encrypted identifiers
  emails_encrypted: string[];
  emails_hash: string[];
  phones_encrypted: string[];
  phones_hash: string[];
  
  name: string;
  
  // Cached stats (updated by background worker)
  meta_stats: {
    total_bookings: number;
    completed: number;
    no_shows: number;
    cancellations: number;
    last_visit?: Date;
    first_visit?: Date;
  };
  
  behavior_tag: ClientBehaviorTag;
  internal_flag: boolean; // Requires admin approval
  notes?: string;
  notes_updated_at?: Date;
  notes_updated_by?: string;
}

// ============================================
// ATOMIC LOCK
// ============================================

export interface AtomicLock {
  _id: string;
  business_id: string;
  provider_id: string;
  date: string;
  time_start: string;
  time_end: string;
  room_ids?: string[];
  created_at: Date;
  expires_at: Date; // TTL index
  created_by: string;
  idempotency_key: string;
}

// ============================================
// AUDIT LOG
// ============================================

export interface AuditLog extends TimestampFields {
  _id: string;
  business_id: string;
  entity_type: 'booking' | 'service' | 'user' | 'client' | 'business';
  entity_id: string;
  action: AuditAction;
  performed_by: string;
  performed_by_role: UserRole | 'system';
  previous_state?: Record<string, unknown>;
  new_state?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ip_address?: string;
}

// ============================================
// EMAIL TEMPLATE
// ============================================

export interface EmailTemplate extends SoftDeleteFields, TimestampFields {
  _id: string;
  business_id: string;
  type: 'confirmation' | 'cancellation' | 'reminder' | 'reschedule' | 'follow_up' | 'review_request';
  recipient_type: 'client' | 'provider' | 'business';
  subject: string;
  html_content: string;
  is_enabled: boolean;
}

// ============================================
// FOLLOW-UP
// ============================================

export interface FollowUp extends TimestampFields {
  _id: string;
  business_id: string;
  booking_id: string;
  sender_id: string;
  sender_role: UserRole;
  scheduled_at?: Date;
  sent_at?: Date;
  delivery_status: 'pending' | 'sent' | 'failed';
  message_body: string;
}

// ============================================
// DAY OFF
// ============================================

export interface DayOff extends TimestampFields {
  _id: string;
  business_id: string;
  provider_id: string;
  date: string; // YYYY-MM-DD
  reason?: string;
  created_by: string;
}

// ============================================
// AVAILABILITY ENGINE TYPES
// ============================================

export interface AvailabilityRequest {
  business_id: string;
  provider_id: string;
  service_id: string;
  date: string;
  time: string;
  client_id?: string;
}

export interface AvailabilityResponse {
  available: boolean;
  reason?: AvailabilityBlockReason;
  blocked_by?: string;
}

export type AvailabilityBlockReason =
  | 'EXISTING_BOOKING'
  | 'BUFFER_CONFLICT'
  | 'EXTERNAL_CALENDAR_BUSY'
  | 'PROVIDER_NOT_AVAILABLE'
  | 'PROVIDER_DAY_OFF'
  | 'SERVICE_NOT_AVAILABLE'
  | 'LEAD_TIME_VIOLATION'
  | 'MAX_ADVANCE_EXCEEDED'
  | 'ROOM_CAPACITY_EXCEEDED'
  | 'CLINIC_CAPACITY_EXCEEDED'
  | 'FREQUENCY_LIMIT_EXCEEDED'
  | 'PROVIDER_NOT_ELIGIBLE'
  | 'SERVICE_DISABLED'
  | 'OUTSIDE_WORKING_HOURS';

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}
