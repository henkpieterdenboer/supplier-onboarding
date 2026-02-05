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

- `/src/app/(dashboard)/` - Protected pages (dashboard, requests) using route groups
- `/src/app/api/` - API route handlers (auth, requests, supplier)
- `/src/app/supplier/[token]/` - Public supplier form (no auth required)
- `/src/app/login/` - Login page

### Key Libraries

- `@/lib/auth.ts` - NextAuth configuration with JWT strategy
- `@/lib/db.ts` - Prisma client singleton
- `@/lib/email.ts` - Email service using Nodemailer
- `@/types/index.ts` - Shared TypeScript types and enums (Role, Status, Region, Incoterm, FileType, AuditAction)

### Database Models (Prisma)

- **User** - Internal users with roles: INKOPER, FINANCE, ERP
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
- Public routes: `/supplier/[token]`, `/login`
- Demo accounts: inkoper@demo.nl, finance@demo.nl, erp@demo.nl (all use demo123)

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
