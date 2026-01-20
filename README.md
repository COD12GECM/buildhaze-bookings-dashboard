# BuildHaze Booking & Management Dashboard

A premium booking management dashboard built with Next.js 14, featuring:

- **Central Availability Engine** - Atomic, conflict-proof booking logic
- **Role-Based Access Control** - Admin, Staff, Provider roles with granular permissions
- **Real-Time Updates** - WebSocket-ready architecture
- **Soft Delete System** - All data is preserved for audit and analytics
- **Field-Level Encryption** - AES-256-GCM for PII protection

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes, MongoDB
- **Authentication**: JWT with bcrypt
- **Calendar**: FullCalendar (planned)
- **Email**: Brevo API

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Create `.env.local`:

```
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
BREVO_API_KEY=your_brevo_key
ENCRYPTION_KEY=your_32_byte_hex_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Deploy on Render

This app is configured for deployment on Render.com with auto-deploy from GitHub.
