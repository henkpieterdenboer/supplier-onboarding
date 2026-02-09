# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Supplier Onboarding application - a multi-step workflow system for onboarding suppliers. The workflow passes through multiple departments: Inkoper (Purchaser) → Leverancier (Supplier) → Inkoper → Finance → ERP.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL via Neon (Prisma ORM)
- **Auth**: NextAuth.js with credentials provider
- **UI**: Tailwind CSS 4 + shadcn/ui components
- **Email**: Nodemailer (Ethereal for testing)
- **File Storage**: Vercel Blob

## Common Commands

```bash
# Development
npm run dev          # Start dev server at localhost:3000

# Build
npm run build        # Production build

# Database
npm run db:migrate   # Run Prisma migrations (prisma migrate dev)
npm run db:seed      # Seed demo accounts (tsx prisma/seed.ts)
npm run db:reset     # Reset database (prisma migrate reset)

# Linting
npm run lint         # Run ESLint
```

## Architecture

### Route Structure

- `/src/app/(dashboard)/` - Protected pages (dashboard, requests, admin) using route groups
- `/src/app/(dashboard)/admin/users/` - Admin user management page (ADMIN only)
- `/src/app/api/` - API route handlers (auth, requests, supplier, admin)
- `/src/app/supplier/[token]/` - Public supplier form (no auth required)
- `/src/app/login/` - Login page
- `/src/app/activate/[token]/` - Public account activation page
- `/src/app/forgot-password/` - Public password reset request page
- `/src/app/reset-password/[token]/` - Public password reset page

### Key Libraries

- `@/lib/auth.ts` - NextAuth configuration with JWT strategy, isActive checks
- `@/lib/db.ts` - Prisma client singleton
- `@/lib/email.ts` - Email service using Nodemailer (activation, password reset, notifications)
- `@/lib/user-utils.ts` - User helper functions (formatUserName)
- `@/types/index.ts` - Shared TypeScript types and enums (Role, Status, Region, Incoterm, FileType, AuditAction)

### Database Models (Prisma)

- **User** - Internal users with roles: ADMIN, INKOPER, FINANCE, ERP (soft delete via isActive, activation flow)
- **SupplierRequest** - Main onboarding request with workflow status
- **SupplierFile** - Uploaded documents (KVK, PASSPORT, OTHER)
- **AuditLog** - Audit trail for all actions

### Workflow Statuses

```
INVITATION_SENT → AWAITING_PURCHASER → AWAITING_FINANCE → AWAITING_ERP → COMPLETED
                                                                          ↓
                                                                      CANCELLED
```

### Authentication

- Protected routes handled by `src/middleware.ts` using NextAuth
- Public routes: `/supplier/[token]`, `/login`, `/activate/[token]`, `/forgot-password`, `/reset-password/[token]`
- Admin routes (`/admin/*`): only accessible by ADMIN role
- Demo accounts: admin@demo.nl, inkoper@demo.nl, finance@demo.nl, erp@demo.nl (all use demo123)
- User activation flow: new users get activation email -> set password -> account activated
- Password reset flow: forgot password -> email with reset link -> set new password

### Import Alias

Use `@/*` for imports from `src/` directory (configured in tsconfig.json).

## Environment Variables

Required variables (see `.env.example`):
- `DATABASE_URL` / `DIRECT_URL` - Neon PostgreSQL connection strings
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL` - NextAuth configuration
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email configuration
- `DEMO_EMAIL` - All demo emails redirect here
- `APP_URL` - Base URL for email links
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage (auto-added by Vercel)

## Language Notes

The application UI and user-facing content is in Dutch. Variable names and code comments use English.
