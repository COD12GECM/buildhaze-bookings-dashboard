# BuildHaze Booking & Management Dashboard
## Technical Implementation Plan

---

## 🏗️ SYSTEM ARCHITECTURE

### Hierarchy (3 Levels)

```
┌─────────────────────────────────────────────────────────────┐
│                    SUPER ADMIN (BuildHaze)                  │
│  - Control panel at /super-admin                            │
│  - Can create/invite Business Owners                        │
│  - Ghost login into any account (no password needed)        │
│  - View all businesses, analytics, audit logs               │
│  - Manage platform-wide settings                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Invites via Brevo (unique code)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 OWNER/ADMIN (Business Account)              │
│  - Dashboard at /dashboard                                  │
│  - Full control over their business                         │
│  - Can invite Staff and Providers                           │
│  - CANNOT create other Admins                               │
│  - Manage services, team, bookings, analytics, templates    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Invites via Brevo (unique code)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              TEAM MEMBERS (Staff / Provider)                │
│  - Same dashboard, different permissions                    │
│  - Staff: Global booking access, no config                  │
│  - Provider: Own bookings only, own calendar only           │
│  - Each has separate profile with password                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 DATABASE SCHEMA (MongoDB)

### Collections

#### 1. `super_admins` (BuildHaze team only)
```javascript
{
  _id: ObjectId,
  email: String (encrypted),
  email_hash: String (SHA-256 for lookup),
  password_hash: String (bcrypt),
  name: String,
  permissions: {
    can_create_businesses: Boolean,
    can_ghost_login: Boolean,
    can_view_all_data: Boolean,
    can_manage_platform: Boolean
  },
  is_active: Boolean,
  created_at: Date,
  updated_at: Date
}
```

#### 2. `businesses` (One per client)
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (encrypted),
  email_hash: String,
  phone: String (encrypted),
  phone_hash: String,
  address: String,
  website: String,
  timezone: String (e.g., "Europe/Bucharest"),
  settings: {
    slots_per_hour: Number,
    default_buffer_before: Number,
    default_buffer_after: Number,
    max_advance_booking_days: Number,
    min_lead_time_hours: Number,
    rooms_available: Number,
    working_hours: {
      monday: { enabled: Boolean, start: String, end: String },
      // ... other days
    }
  },
  google_review_url: String,
  brevo_sender_email: String,
  shopify_store_url: String,
  is_active: Boolean,
  is_deleted: Boolean,
  created_at: Date,
  updated_at: Date,
  created_by: ObjectId (super_admin_id)
}
```

#### 3. `invitations` (For both Admin and Team invites)
```javascript
{
  _id: ObjectId,
  business_id: ObjectId (null for admin invites),
  type: Enum ['ADMIN', 'STAFF', 'PROVIDER'],
  email: String (encrypted),
  email_hash: String,
  code: String (unique, 32 chars),
  name: String,
  role_config: {
    services: [ObjectId],
    permissions: Object,
    working_hours: Object,
    booking_limits: Object
  },
  invited_by: ObjectId,
  invited_by_type: Enum ['SUPER_ADMIN', 'ADMIN'],
  status: Enum ['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'],
  expires_at: Date,
  accepted_at: Date,
  created_at: Date
}
```

#### 4. `users` (All dashboard users: Admin, Staff, Provider)
```javascript
{
  _id: ObjectId,
  business_id: ObjectId,
  email: String (encrypted),
  email_hash: String,
  password_hash: String,
  name: String,
  role: Enum ['ADMIN', 'STAFF', 'PROVIDER'],
  permissions: {
    can_view_all_bookings: Boolean,
    can_create_bookings: Boolean,
    can_modify_bookings: Boolean,
    can_cancel_bookings: Boolean,
    can_manage_services: Boolean,
    can_manage_team: Boolean,
    can_view_analytics: Boolean,
    can_export_data: Boolean,
    can_edit_templates: Boolean,
    can_drag_drop_calendar: Boolean
  },
  service_ids: [ObjectId],
  working_hours: Object,
  booking_limits: {
    max_per_day: Number,
    max_per_week: Number
  },
  color: String (for calendar),
  calendar_sync: {
    google: { connected: Boolean, token: Object, calendar_id: String },
    outlook: { connected: Boolean, token: Object, calendar_id: String },
    apple: { connected: Boolean, token: Object, calendar_id: String }
  },
  days_off: [{ date: Date, reason: String }],
  is_active: Boolean,
  is_deleted: Boolean,
  must_change_password: Boolean,
  last_login: Date,
  invitation_id: ObjectId,
  created_at: Date,
  updated_at: Date
}
```

#### 5. `services`
```javascript
{
  _id: ObjectId,
  business_id: ObjectId,
  name: String,
  description: String,
  duration: Number (minutes),
  price: Number,
  buffer_before: Number (minutes),
  buffer_after: Number (minutes),
  min_lead_time_hours: Number,
  max_advance_days: Number,
  rooms_required: Number,
  available_days: [String],
  available_hours: { start: String, end: String },
  frequency_limit: {
    per_client: { count: Number, period_days: Number }
  },
  provider_ids: [ObjectId],
  is_enabled: Boolean,
  is_deleted: Boolean,
  version: Number (for optimistic locking),
  created_at: Date,
  updated_at: Date
}
```

#### 6. `bookings` (Compatible with existing booking-api)
```javascript
{
  _id: ObjectId,
  id: Number (legacy, Date.now()),
  business_id: ObjectId,
  service_id: ObjectId,
  provider_id: ObjectId,
  client: {
    name: String,
    email: String (encrypted),
    email_hash: String,
    phone: String (encrypted),
    phone_hash: String,
    notes: String
  },
  client_id: ObjectId (reference to clients collection),
  date: String (YYYY-MM-DD),
  time: String (HH:MM),
  utc_start: Date,
  utc_end: Date,
  duration: Number (snapshot at booking time),
  price: Number (snapshot at booking time),
  buffer_before: Number (snapshot),
  buffer_after: Number (snapshot),
  status: Enum ['CONFIRMED', 'ARRIVED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'],
  requires_resolution: Boolean,
  lead_source: Enum ['AI_CHAT', 'DIRECT_LINK', 'MANUAL_STAFF', 'PROVIDER_SELF', 'ADMIN_MANUAL', 'SHOPIFY'],
  cancelToken: String,
  cancellation_reason: String,
  cancelled_by: ObjectId,
  cancelled_at: Date,
  sync_status: Enum ['SYNCED', 'PENDING_RETRY', 'FAILED'],
  external_event_ids: {
    google: String,
    outlook: String,
    apple: String
  },
  review_request_sent: Boolean,
  review_sent_at: Date,
  review_rating: Number,
  idempotency_key: String,
  version: Number,
  is_deleted: Boolean,
  created_at: Date,
  updated_at: Date,
  created_by: ObjectId,
  created_by_type: Enum ['ADMIN', 'STAFF', 'PROVIDER', 'SYSTEM', 'AI']
}
```

#### 7. `clients` (Patient Card)
```javascript
{
  _id: ObjectId,
  business_id: ObjectId,
  identifiers: [{
    type: Enum ['EMAIL', 'PHONE'],
    value_encrypted: String,
    value_hash: String,
    added_at: Date
  }],
  name: String,
  notes: String (persistent clinical note),
  notes_history: [{
    content: String,
    changed_by: ObjectId,
    changed_at: Date
  }],
  meta_stats: {
    total_bookings: Number,
    completed: Number,
    no_shows: Number,
    cancellations: Number,
    first_visit: Date,
    last_visit: Date
  },
  behavior_tag: Enum ['VIP', 'REGULAR', 'RISK', 'NEW'],
  internal_flag: Boolean (requires manual approval),
  is_deleted: Boolean,
  created_at: Date,
  updated_at: Date
}
```

#### 8. `atomic_locks`
```javascript
{
  _id: ObjectId,
  business_id: ObjectId,
  provider_id: ObjectId,
  date: String,
  time_start: String,
  time_end: String,
  room_id: String,
  locked_by: ObjectId,
  idempotency_key: String,
  expires_at: Date (TTL index, 60 seconds)
}
```

#### 9. `audit_logs` (Append-only)
```javascript
{
  _id: ObjectId,
  business_id: ObjectId,
  event_type: String,
  entity_type: Enum ['BOOKING', 'SERVICE', 'USER', 'BUSINESS', 'TEMPLATE'],
  entity_id: ObjectId,
  previous_state: Object,
  new_state: Object,
  performed_by: ObjectId,
  performed_by_type: Enum ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'PROVIDER', 'SYSTEM'],
  ip_address: String,
  user_agent: String,
  metadata: Object,
  created_at: Date
}
```

#### 10. `email_templates`
```javascript
{
  _id: ObjectId,
  business_id: ObjectId,
  type: Enum ['BOOKING_CONFIRMATION', 'BOOKING_CANCELLATION', 'BOOKING_RESCHEDULE', 'BOOKING_REMINDER', 'FOLLOW_UP', 'REVIEW_REQUEST', 'ADMIN_INVITE', 'TEAM_INVITE'],
  recipient_type: Enum ['CLIENT', 'PROVIDER', 'BUSINESS'],
  subject: String,
  body: String (HTML with variables),
  variables: [String],
  is_enabled: Boolean,
  is_deleted: Boolean,
  created_at: Date,
  updated_at: Date
}
```

#### 11. `follow_ups`
```javascript
{
  _id: ObjectId,
  business_id: ObjectId,
  booking_id: ObjectId,
  client_id: ObjectId,
  sender_id: ObjectId,
  sender_role: Enum ['ADMIN', 'STAFF', 'PROVIDER'],
  message: String,
  scheduled_at: Date,
  sent_at: Date,
  status: Enum ['SCHEDULED', 'SENT', 'FAILED'],
  created_at: Date
}
```

---

## 🔐 AUTHENTICATION FLOW

### Super Admin Login
- Route: `/super-admin/login`
- Separate JWT with `type: 'super_admin'`
- Access to `/super-admin/*` routes only

### Admin/Staff/Provider Login
- Route: `/login`
- JWT contains: `userId`, `businessId`, `role`, `permissions`
- Access to `/dashboard/*` routes

### Invitation Flow (Brevo)

#### Admin Invitation (by Super Admin)
1. Super Admin creates invitation in dashboard
2. System generates unique 32-char code
3. Brevo sends email with link: `https://dashboard.buildhaze.com/invite/{code}`
4. Recipient clicks link → Registration form
5. Sets password → Account created with role ADMIN
6. Redirected to dashboard

#### Team Invitation (by Admin)
1. Admin creates invitation in Team tab
2. Defines: name, email, role, services, permissions, working hours
3. System generates unique code
4. Brevo sends email with link
5. Recipient sets password → Account created
6. Logged into business dashboard

### Ghost Login (Super Admin only)
1. Super Admin selects business from list
2. Clicks "Ghost Login"
3. System generates temporary JWT for that business's Admin
4. Super Admin sees dashboard as if they were the Admin
5. All actions logged with `performed_by_type: 'SUPER_ADMIN'`

---

## 📧 BREVO EMAIL INTEGRATION

### Transactional Emails (Automatic)
- Booking Confirmation
- Booking Cancellation
- Booking Reschedule
- Booking Reminder (24h, 1h before)
- Provider Notification
- Admin Invitation
- Team Invitation
- Review Request (after COMPLETED)

### Template Variables
```
{{client_name}}
{{service_name}}
{{provider_name}}
{{date}}
{{time}}
{{business_name}}
{{business_phone}}
{{cancel_link}}
{{reschedule_link}}
{{review_link}}
{{invite_link}}
{{invite_code}}
```

### Rate Limits (Anti-Spam)
- Max 3 follow-ups per booking
- Max 5 follow-ups per user per hour
- Max 20 follow-ups per user per day
- Min 10 minutes between follow-ups to same client

---

## 🛒 SHOPIFY INTEGRATION

### aesthetica-booking.liquid Compatibility
The Shopify booking widget must:
1. Send booking requests to Dashboard API (not booking-api directly)
2. Include `business_email` to identify which business
3. Dashboard validates and creates booking
4. Syncs with booking-api for legacy compatibility

### Flow
```
Shopify Widget → Dashboard API → Availability Engine → MongoDB → Booking-API Sync
```

### Required Shopify Schema Settings
```liquid
{% schema %}
{
  "settings": [
    {
      "type": "text",
      "id": "business_email",
      "label": "Business Email (must match Dashboard)"
    },
    {
      "type": "text",
      "id": "api_endpoint",
      "label": "Dashboard API URL",
      "default": "https://buildhaze-dashboard.onrender.com/api"
    }
  ]
}
{% endschema %}
```

---

## 🗓️ CALENDAR SYNC

### Supported Providers
- Google Calendar (OAuth 2.0)
- Outlook Calendar (Microsoft Graph API)
- Apple Calendar (CalDAV)

### Sync Behavior
- **Outbound**: Confirmed bookings → External calendar
- **Inbound**: External busy slots → Block availability
- **Webhooks**: Real-time updates from external calendars

### Reconciliation (Hourly)
- Compare MongoDB bookings with external events
- Force external to match internal (internal is truth)
- Log all corrections

---

## 📊 ANALYTICS METRICS

### Admin Dashboard
- Total Bookings (by period)
- Completion Rate
- Cancellation Rate
- No-Show Rate
- Peak Hours Heatmap
- Service Popularity
- Provider Utilization
- Lead Source Distribution
- Estimated Service Value
- Human Hours Saved (AI bookings × 5 min)
- Google Reviews Generated

### Provider Dashboard (Own only)
- Own bookings count
- Own completion rate
- Own no-shows
- Own utilization

---

## 🔄 BOOKING LIFECYCLE

### States
```
CONFIRMED → ARRIVED → COMPLETED
    ↓           ↓
CANCELLED   NO_SHOW
```

### Transitions (Server-enforced)
- CONFIRMED → ARRIVED (Check-in)
- CONFIRMED → CANCELLED (Cancel)
- ARRIVED → COMPLETED (Mark done)
- ARRIVED → NO_SHOW (Mark no-show)
- CONFIRMED → NO_SHOW (Direct, if never arrived)

### Review Request
- Triggered ONLY on transition to COMPLETED
- One-time per booking (idempotent)
- 2-step funnel: Internal rating → Google redirect (4-5 stars only)

---

## 🛡️ SECURITY

### PII Encryption
- Algorithm: AES-256-GCM
- Fields: email, phone, notes
- Lookup: SHA-256 hash index

### Permission Enforcement
- All permissions checked server-side
- UI visibility ≠ permission
- Every API validates: business_id, user_id, role, permissions

### Audit Trail
- Append-only collection
- Cannot be modified or deleted
- Logs: who, what, when, old value, new value

---

## 🚀 API ROUTES

### Super Admin Routes (`/api/super-admin/*`)
```
POST   /api/super-admin/auth/login
POST   /api/super-admin/auth/logout
GET    /api/super-admin/businesses
POST   /api/super-admin/businesses
GET    /api/super-admin/businesses/:id
PATCH  /api/super-admin/businesses/:id
POST   /api/super-admin/invitations (Admin invite)
GET    /api/super-admin/invitations
POST   /api/super-admin/ghost-login/:businessId
GET    /api/super-admin/analytics
GET    /api/super-admin/audit-logs
```

### Auth Routes (`/api/auth/*`)
```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/accept-invite/:code
POST   /api/auth/change-password
```

### Booking Routes (`/api/bookings/*`)
```
GET    /api/bookings
POST   /api/bookings
GET    /api/bookings/:id
PATCH  /api/bookings/:id
DELETE /api/bookings/:id (soft cancel)
POST   /api/bookings/:id/check-in
POST   /api/bookings/:id/complete
POST   /api/bookings/:id/no-show
POST   /api/bookings/:id/follow-up
```

### Service Routes (`/api/services/*`)
```
GET    /api/services
POST   /api/services
GET    /api/services/:id
PATCH  /api/services/:id
DELETE /api/services/:id (soft delete)
```

### Team Routes (`/api/team/*`)
```
GET    /api/team
POST   /api/team/invite
GET    /api/team/:id
PATCH  /api/team/:id
DELETE /api/team/:id (soft delete)
POST   /api/team/:id/disable
POST   /api/team/:id/enable
```

### Availability Routes (`/api/availability/*`)
```
GET    /api/availability/slots?date=&service_id=&provider_id=
GET    /api/availability/debug/:slot (Admin only)
```

### Calendar Routes (`/api/calendar/*`)
```
GET    /api/calendar/events
POST   /api/calendar/connect/:provider
POST   /api/calendar/disconnect/:provider
POST   /api/calendar/sync
```

### Analytics Routes (`/api/analytics/*`)
```
GET    /api/analytics/overview
GET    /api/analytics/bookings
GET    /api/analytics/providers
GET    /api/analytics/services
GET    /api/analytics/heatmap
GET    /api/analytics/export
```

### Settings Routes (`/api/settings/*`)
```
GET    /api/settings/business
PATCH  /api/settings/business
GET    /api/settings/templates
PATCH  /api/settings/templates/:id
```

### Client Routes (`/api/clients/*`)
```
GET    /api/clients
GET    /api/clients/:id
GET    /api/clients/:id/history
PATCH  /api/clients/:id/notes
```

### Webhook Routes (`/api/webhooks/*`)
```
POST   /api/webhooks/google-calendar
POST   /api/webhooks/outlook-calendar
POST   /api/webhooks/shopify-booking
```

---

## 📁 FOLDER STRUCTURE

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── invite/[code]/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── bookings/page.tsx
│   │   ├── calendar/page.tsx
│   │   ├── services/page.tsx
│   │   ├── team/page.tsx
│   │   ├── analytics/page.tsx
│   │   ├── clients/page.tsx
│   │   └── settings/page.tsx
│   ├── (super-admin)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── businesses/page.tsx
│   │   ├── invitations/page.tsx
│   │   └── audit-logs/page.tsx
│   └── api/
│       ├── auth/
│       ├── bookings/
│       ├── services/
│       ├── team/
│       ├── availability/
│       ├── calendar/
│       ├── analytics/
│       ├── settings/
│       ├── clients/
│       ├── webhooks/
│       ├── super-admin/
│       └── health/
├── components/
│   ├── ui/ (shadcn)
│   ├── booking/
│   ├── calendar/
│   ├── analytics/
│   └── shared/
├── lib/
│   ├── db.ts
│   ├── auth.ts
│   ├── availability-engine.ts
│   ├── atomic-lock.ts
│   ├── brevo.ts
│   ├── encryption.ts
│   ├── calendar-sync.ts
│   └── audit.ts
├── models/
│   ├── SuperAdmin.ts
│   ├── Business.ts
│   ├── User.ts
│   ├── Service.ts
│   ├── Booking.ts
│   ├── Client.ts
│   ├── Invitation.ts
│   ├── AtomicLock.ts
│   ├── AuditLog.ts
│   ├── EmailTemplate.ts
│   └── FollowUp.ts
└── types/
    └── index.ts
```

---

## ✅ IMPLEMENTATION ORDER

### Phase 1: Core Infrastructure
1. ✅ Next.js project setup
2. ✅ MongoDB connection
3. ✅ Basic schemas (User, Service, Booking)
4. ✅ Central Availability Engine
5. ✅ Atomic Lock System
6. ✅ JWT Authentication
7. ✅ PII Encryption
8. ✅ Basic API routes
9. ✅ Basic UI (login, dashboard)

### Phase 2: Multi-Tenant & Invitations
10. [ ] Super Admin schema & routes
11. [ ] Business schema updates
12. [ ] Invitation schema & flow
13. [ ] Brevo email integration
14. [ ] Super Admin dashboard UI
15. [ ] Ghost login functionality
16. [ ] Team invitation flow

### Phase 3: Full Dashboard
17. [ ] Services management page
18. [ ] Team management page
19. [ ] Bookings page (full features)
20. [ ] Calendar page (FullCalendar)
21. [ ] Client history (Patient Card)
22. [ ] Analytics dashboard
23. [ ] Settings/Communication page

### Phase 4: Integrations
24. [ ] Google Calendar sync
25. [ ] Outlook Calendar sync
26. [ ] Apple Calendar sync
27. [ ] Shopify webhook integration
28. [ ] Booking-API sync

### Phase 5: Advanced Features
29. [ ] Audit log viewer
30. [ ] Global Watcher (background jobs)
31. [ ] Review request system
32. [ ] Export functionality
33. [ ] Real-time updates (WebSocket)

---

## 🔑 ENVIRONMENT VARIABLES

```env
# MongoDB
MONGODB_URI=mongodb+srv://...

# JWT
JWT_SECRET=...
JWT_SUPER_ADMIN_SECRET=...

# Brevo
BREVO_API_KEY=...

# Encryption
ENCRYPTION_KEY=...

# OAuth (Calendar Sync)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
OUTLOOK_CLIENT_ID=...
OUTLOOK_CLIENT_SECRET=...

# App
NEXT_PUBLIC_APP_URL=https://buildhaze-dashboard.onrender.com
BOOKING_API_URL=https://booking-api-08uo.onrender.com
```

---

## 📝 NOTES

### Booking-API Compatibility
- Dashboard uses same MongoDB cluster
- Bookings collection shared
- Dashboard adds new fields, booking-api ignores them
- Both can read/write bookings
- Dashboard is the new authority

### Shopify Integration
- aesthetica-booking.liquid must be updated
- Point to Dashboard API instead of booking-api
- Include business_email for tenant identification
- Dashboard handles all validation

### Soft Delete Rules
- NEVER hard delete
- Always use is_deleted flag
- Audit all deletions
- Allow recovery

---

*Last Updated: January 2026*
*Version: 2.0*
