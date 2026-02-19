# TODO - Supplier Onboarding

## Kritiek (voor productie)

- [x] **Demo role switcher verwijderen** - Staat achter `NEXT_PUBLIC_DEMO_MODE` flag.
- [x] **`receiveEmails` veld daadwerkelijk checken** - Notificatie-emails checken `receiveEmails` per user.
- [x] **Hardcoded demo email-adressen vervangen** - Finance/ERP notificaties gaan nu dynamisch.
- [x] **Demo credentials van login/dashboard pagina halen** - Staat achter `NEXT_PUBLIC_DEMO_MODE` flag.
- [x] **Input validatie toevoegen** - Alle API routes gevalideerd via Zod schemas in `src/lib/validations.ts`. Enum values, email formaat, string lengtes, type coercion, status transities.

## Hoog (zou moeten)

- [x] **Custom error pages maken** - `error.tsx`, `not-found.tsx`, en `global-error.tsx` zijn aangemaakt.
- [x] **Leverancierstypen** - Koop, X-kweker, O-kweker met conditionele formuliersecties, type-aware validatie, type-kolom in dashboard.
- [x] **Opslaan & later verder** - Leverancier kan tussentijds opslaan, krijgt email met link om later verder te gaan. Invitation expiry 14 dagen.
- [x] **File upload validatie** - Server-side validatie via `validateFile()`: max 10MB, alleen PDF/JPG/PNG. Geimplementeerd in zowel supplier als requests upload routes.

## Medium (verbetering)

- [ ] **Middleware deprecation** - Next.js 16 geeft warning dat `middleware.ts` deprecated is en `proxy` gebruikt moet worden.
- [ ] **Nav interface opschonen** - `user.name` type in `src/components/dashboard/nav.tsx` interface is technisch correct maar kan verwarrend zijn.
- [ ] **DEMO_EMAIL fallback verwijderen** - Hardcoded fallback email in `src/lib/email.ts` zou in productie expliciet moeten falen.

## Nice to have

- [ ] **Audit logging voor admin acties** - User CRUD acties worden niet gelogd in de AuditLog tabel.
- [ ] **Pagination** - Gebruikers- en aanvragentabellen laden alles in een keer.
- [x] **Wachtwoord-sterkte eisen** - Minimum 8 tekens, gevalideerd via Zod schemas in registratie, activatie en password reset.
- [ ] **Rate limiting** - Op login, forgot-password, en activatie endpoints.
- [ ] **Email templates verbeteren** - Consistenter design, evt. met een template engine.

## Recent opgelost (feb 2026)

- [x] **Notificatie label-filter** - Notificatie-emails filteren nu op label, zodat gebruikers alleen meldingen krijgen voor hun eigen merk(en).
- [x] **Database indexen** - Indexen toegevoegd op `label`, `status` en `createdById` voor betere query-performance.
- [x] **Email taal per ontvanger** - Elke ontvanger krijgt notificatie-emails in hun eigen `preferredLanguage` i.p.v. de taal van de leverancier.

## Deployment checklist (leverancierstypen)

Wanneer klaar met testen op test-omgeving:
- [x] `prisma db push` op productie-database (ancient-shadow)
- [x] Merge `develop` -> `main`
- [x] Push `main` naar origin -> deploy naar productie
- [x] Verifieer productie-omgeving
