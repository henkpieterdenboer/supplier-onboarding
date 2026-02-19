# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Supplier Onboarding — a multi-department workflow for registering new suppliers. The workflow: **Inkoper** (Purchaser) creates request → **Leverancier** (Supplier) fills form → **Inkoper** reviews → **Finance** assigns creditor number → **ERP** assigns KBT code → **Completed**.

UI is in **Dutch**, code (variables, comments) is in **English**.

## Tech Stack

- **Framework**: Next.js 16 with App Router, React 19 (TypeScript strict mode)
- **Database**: PostgreSQL via Neon (Prisma ORM with `@prisma/adapter-neon` + WebSocket driver, `previewFeatures = ["driverAdapters"]` required in schema)
- **Auth**: NextAuth.js v4 (JWT strategy, credentials + optional Azure AD SSO)
- **UI**: Tailwind CSS 4 + shadcn/ui (new-york style, neutral base color, lucide icons, Geist Sans/Mono fonts)
- **Toasts**: sonner (`<Toaster />` in root layout)
- **Email**: Nodemailer with two providers — Ethereal (dev/demo) and Resend SMTP (production). In demo mode, a cookie toggles between providers.
- **File Storage**: Vercel Blob
- **Validation**: Zod v4 — all API routes validated via schemas in `src/lib/validations.ts`
- **Forms**: Manual `useState` management (react-hook-form was removed as unused)
- **Excel Export**: xlsx
- **i18n**: Custom translation system (`src/lib/i18n.ts`) with NL/EN JSON files (`src/translations/`). `LanguageProvider` context wraps all pages via root layout. Language persisted via `NEXT_LOCALE` cookie.

## Commands

```bash
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint (eslint-config-next)
npm run db:seed          # Seed demo accounts (tsx prisma/seed.ts)
npm run db:sync-test     # Sync production → test DB (tsx prisma/sync-test-db.ts)
npx prisma db push       # Push schema changes to DB
npx prisma generate      # Regenerate Prisma client after schema changes
npx prisma studio        # Open Prisma Studio DB browser
```

**Important**: Do NOT use `prisma migrate dev` — this project uses `prisma db push` for schema changes and manual SQL when needed. The `prisma/migrations/` directory is historical only — do not use it.

**No test framework**: This project has no unit/integration tests. Don't try to run `npm test`.

**Vercel build**: `vercel.json` runs `npx prisma generate --schema=./prisma/schema.prisma` before `npm run build`. Additionally, `postinstall` in package.json runs `npx prisma generate`, so `npm install` also triggers Prisma client generation (which means the Windows EPERM issue applies to `npm install` too when the dev server is running).

## Architecture

### Database Connection & Models

Prisma uses the Neon serverless adapter (`@prisma/adapter-neon`) with WebSocket pooling. The client singleton is in `src/lib/db.ts`. Two connection strings required: `DATABASE_URL` (pooled, for app) and `DIRECT_URL` (direct, for Prisma operations).

Four models in `prisma/schema.prisma`: **User** (internal staff with `preferredLanguage`), **SupplierRequest** (main workflow entity with ~40 fields including `supplierLanguage`), **SupplierFile** (uploaded documents, Vercel Blob), **AuditLog** (action trail per request). All IDs are UUIDs. Files cascade-delete with their request.

### Authentication Flow

- **NextAuth JWT strategy** — no database sessions (`src/lib/auth.ts`)
- JWT callback fetches latest `roles` and `isActive` from DB on **every request** — role changes and deactivations take effect immediately
- User deactivation invalidates the session by returning an empty token
- API routes check `getServerSession(authOptions)` and verify roles manually
- `src/middleware.ts` handles route protection (public vs auth vs admin)
- Azure AD SSO is conditional on `AZURE_AD_CLIENT_ID` env var being set
- Azure AD users are auto-activated on first SSO login (bypasses email activation flow)
- In demo mode, logging in as a demo user resets their roles to defaults (prevents role-switch persistence)

### User Model

- Users have `firstName`, `middleName` (nullable), `lastName` — always use `formatUserName()` from `@/lib/user-utils.ts`
- Roles stored as `String[]`: `ADMIN`, `INKOPER`, `FINANCE`, `ERP` (users can have multiple roles)
- Check roles with `.includes('ROLE')`, never equality comparison
- Activation: new user gets `activationToken` → clicks email link → sets password → `isActive = true`. Same fields reused for password reset.

### Route Structure

- `src/app/(dashboard)/` — Protected route group (dashboard, requests, admin)
- `src/app/api/` — API route handlers (auth, requests, admin/users, supplier, files, email-provider, user/language, vies)
- `src/app/supplier/[token]/` — Public supplier form (no auth)
- `src/app/login/`, `activate/`, `forgot-password/`, `reset-password/` — Public auth pages

### API Route Pattern

All protected API routes follow:
```typescript
const session = await getServerSession(authOptions)
if (!session?.user) return NextResponse.json({ error: '...' }, { status: 401 })
if (!session.user.roles.includes('REQUIRED_ROLE')) return NextResponse.json({ error: '...' }, { status: 403 })
```

### Input Validation (Zod)

All API routes use Zod schemas from `src/lib/validations.ts`. Pattern:
```typescript
import { createRequestSchema } from '@/lib/validations'
const parsed = createRequestSchema.safeParse(body)
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
}
const { field1, field2 } = parsed.data
```

Schemas validate: enum values (roles, labels, regions, supplier types, incoterms), email formats, string lengths, type coercion (string→number for commissionPercentage, string→boolean for mandateRFH). Password minimum: 8 characters.

Workflow status transitions are validated: purchaser-submit requires `AWAITING_PURCHASER`, finance-submit requires `AWAITING_FINANCE`, erp-submit requires `AWAITING_ERP`.

File uploads validated server-side: max 10MB, only PDF/JPG/PNG (`validateFile()` in both upload routes).

### Workflow Statuses

```
INVITATION_SENT → AWAITING_PURCHASER → AWAITING_FINANCE → AWAITING_ERP → COMPLETED
Any status can → CANCELLED (and CANCELLED can be reopened)
```

### Email System

`src/lib/email.ts` handles all outgoing email. Two providers: **Ethereal** (dev/demo default) and **Resend** (production SMTP via `smtp.resend.com:465`). In demo mode, a cookie (`email-provider`) toggles between providers. In production (non-demo), it always uses the Resend SMTP config.

All email functions accept a `language` parameter and use `getTranslation()` for i18n. In demo mode (`NEXT_PUBLIC_DEMO_MODE=true`), all emails redirect to `DEMO_EMAIL` with a banner showing the original recipient. Email failures are caught and logged — they never block the workflow. Notifications go to all active users with the relevant role who have `receiveEmails=true`.

### i18n (Translations)

- Translation files: `src/translations/nl.json` (Dutch, default) and `src/translations/en.json` (English)
- `src/lib/i18n.ts` — `getTranslation(lang, key)` with dot-notation path lookup and `{{variable}}` interpolation, falls back to NL then to the key itself. Also exports `formatDate()` and `formatTime()` for locale-aware formatting.
- `src/lib/i18n-context.tsx` — `LanguageProvider` React context; `useLanguage()` hook for client components. Persists language via `NEXT_LOCALE` cookie and syncs from JWT session.
- User model has `preferredLanguage` (synced into JWT); SupplierRequest has `supplierLanguage` (controls supplier form + emails)

### Supplier Types

Three supplier types: `KOOP`, `X_KWEKER`, `O_KWEKER`. Koop and O-kweker are identical (financial details, director for ROW, bank upload). X-kweker is different (auction fields, no financial/director/bank upload).

- Section visibility helpers in `src/lib/supplier-type-utils.ts` — simple boolean functions, not a config object
- Forms use conditional JSX sections: `{showFinancialSection(type) && (<Card>...</Card>)}`
- Invitation expiry: 14 days. Suppliers can save progress and resume later via email link.
- `selfFill: Boolean` on SupplierRequest — allows the Inkoper to fill the supplier form themselves (skips supplier invitation)
- Type-aware validation: incoterm only required for Koop/O-kweker

### VIES VAT Validation

`src/lib/vies.ts` validates EU VAT numbers via the VIES REST API. API endpoint: `src/app/api/vies/route.ts`. Schema fields: `vatValid`, `vatCheckResponse` (JSON string), `vatCheckedAt`. Tracked via `AuditAction.VIES_CHECKED`.

### Exact Globe XML Export

`src/lib/exact-xml.ts` generates XML in eExact format for **Exact Globe** (desktop ERP). API endpoint: `src/app/api/requests/[id]/exact-xml/route.ts`. Key format decisions based on Globe export analysis:
- `type="S"` (Supplier), not `"C"` (Customer)
- `<Creditor>` element required with number/code and Currency
- Addresses nested inside `<Contact>`, not directly under `<Account>`
- Bank accounts nested inside `<Creditor>` using IBAN type (`BankAccountType code="IBA"`)
- `creditorNumber` from the database used as Account `code`
- Country codes must be ISO 2-letter (NL, DE, ZA, etc.)
- Globe validates VAT numbers — invalid checksums cause import rejection

### Key Types

All domain enums and Dutch labels are in `src/types/index.ts`: `Role`, `Status`, `Region`, `Incoterm`, `SupplierType`, `FileType`, `AuditAction`, `Label` (plus label maps like `StatusLabels`, `SupplierTypeLabels`, `RoleLabels`, `LabelLabels`).

### Labels (Brands)

Two labels: `COLORIGINZ` (default) and `PFC`. Users have `labels: String[]`, requests have `label: String`.
- Config in `src/lib/label-config.ts` (logo paths, names per label)
- Dashboard filters by user's labels; supplier form and emails show label-specific logo
- Label authorization: API routes and pages check `userLabels.includes(request.label)`

### Components

- `src/components/ui/` — shadcn/ui primitives (don't edit manually, use `npx shadcn@latest add <component>`)
- `src/components/dashboard/` — Nav (role-aware), stats, requests table, user management (table + form dialog)
- `src/components/requests/` — Request detail view components
- `src/components/demo-banner.tsx` — Demo mode banner (reads `NEXT_PUBLIC_DEMO_MODE`)
- `src/components/providers/session-provider.tsx` — NextAuth SessionProvider wrapper

### Import Alias

Use `@/*` for all imports from `src/` (configured in tsconfig.json).

## Environments

Single Vercel project with two deployment targets. Each has its own **separate Neon project** (not branches) and Vercel Blob storage:

- **Production**: `col-supplier-onboarding.vercel.app` — `main` branch, demo mode off
- **Preview/Test**: `col-supplier-onboarding-test.vercel.app` — `develop` branch, demo mode on
- **Local env files**: `.env` points to **test** DB (summer-wildflower). `.env.production` has production DB URLs (ancient-shadow), used only by `db:sync-test`. No local dev server is used — all testing via Vercel Preview.

## Git & Deployment Workflow

Two branches map to two Vercel deployments:
- `develop` → test (`col-supplier-onboarding-test.vercel.app`)
- `main` → live (`col-supplier-onboarding.vercel.app`)

**Default flow** — test first, then promote:
```bash
git checkout develop
# ... make changes, commit ...
git push origin develop              # → deploys to test
# ... verify on test environment ...
git checkout main
git merge develop
git push origin main                 # → deploys to live
git checkout develop
```

**Rules:**
- Never push directly to `main` without the user's explicit approval
- Default working branch is `develop`
- Schema changes (`prisma db push`) must be run against both Neon databases separately
- After schema changes on production: run `npm run db:sync-test` to sync test DB

## Environment Variables

See `.env.example` for the full list. Key variables:
- `DATABASE_URL` / `DIRECT_URL` — Neon PostgreSQL (pooled / direct)
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL` — NextAuth config (URL must match deployment exactly, no trailing slash)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — Email
- `APP_URL` — Base URL for links in emails
- `NEXT_PUBLIC_DEMO_MODE` — Enables demo banner, role switcher, credential display
- `DEMO_EMAIL` — Redirect target for all emails in demo mode
- `RESEND_API_KEY` — Resend SMTP auth (production email)
- `EMAIL_FROM` — From address for Resend emails
- `NEXT_PUBLIC_AZURE_AD_ENABLED` + `AZURE_AD_*` — Optional M365 SSO
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob storage

## Platform Gotchas

- **Windows EPERM on `prisma generate`**: The dev server locks the Prisma query engine DLL. Kill all node processes before running `npx prisma generate`.
- **`prisma migrate dev`** doesn't work in non-interactive terminals. Use `prisma db push` or `prisma db execute --file` instead.
- **Adding NOT NULL columns**: When tables have existing data, add the column as nullable first, backfill data, then alter to NOT NULL.
- **NEXTAUTH_URL on Vercel Preview**: Must exactly match the deployed URL (`https://col-supplier-onboarding-test.vercel.app`). Misconfiguration causes login to silently fail.
- **Vercel env vars per omgeving**: `DATABASE_URL` needs `-pooler` in hostname, `DIRECT_URL` does not. Both must point to the correct Neon project per environment (summer-wildflower for test, ancient-shadow for production).
- **Always commit package.json/lock**: When dependencies change, always include package.json and package-lock.json in the commit. Otherwise Vercel caches stale node_modules.
- **Next.js 16 middleware deprecation**: `middleware.ts` triggers a deprecation warning in Next.js 16, which recommends using the `proxy` approach instead. Currently still works but may need migration in a future version.
