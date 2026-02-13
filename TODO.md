# TODO - Supplier Onboarding

## Kritiek (voor productie)

- [x] **Demo role switcher verwijderen** - Staat achter `NEXT_PUBLIC_DEMO_MODE` flag.
- [x] **`receiveEmails` veld daadwerkelijk checken** - Notificatie-emails checken `receiveEmails` per user.
- [x] **Hardcoded demo email-adressen vervangen** - Finance/ERP notificaties gaan nu dynamisch.
- [x] **Demo credentials van login/dashboard pagina halen** - Staat achter `NEXT_PUBLIC_DEMO_MODE` flag.
- [ ] **Input validatie toevoegen** - Geen Zod schemas ondanks dat het in dependencies zit. Geen sanitization op user input (supplier form, admin forms, API routes). XSS/injection risico.

## Hoog (zou moeten)

- [x] **Custom error pages maken** - `error.tsx`, `not-found.tsx`, en `global-error.tsx` zijn aangemaakt.
- [x] **Leverancierstypen** - Koop, X-kweker, O-kweker met conditionele formuliersecties, type-aware validatie, type-kolom in dashboard.
- [x] **Opslaan & later verder** - Leverancier kan tussentijds opslaan, krijgt email met link om later verder te gaan. Invitation expiry 14 dagen.
- [ ] **File upload validatie** - Geen controle op bestandsgrootte of MIME type bij uploads in `src/app/api/supplier/[token]/route.ts`.

## Medium (verbetering)

- [ ] **Middleware deprecation** - Next.js 16 geeft warning dat `middleware.ts` deprecated is en `proxy` gebruikt moet worden.
- [ ] **Nav interface opschonen** - `user.name` type in `src/components/dashboard/nav.tsx` interface is technisch correct maar kan verwarrend zijn.
- [ ] **DEMO_EMAIL fallback verwijderen** - Hardcoded fallback email in `src/lib/email.ts` zou in productie expliciet moeten falen.

## Nice to have

- [ ] **Audit logging voor admin acties** - User CRUD acties worden niet gelogd in de AuditLog tabel.
- [ ] **Pagination** - Gebruikers- en aanvragentabellen laden alles in een keer.
- [ ] **Wachtwoord-sterkte eisen** - Nu alleen minimaal 6 tekens.
- [ ] **Rate limiting** - Op login, forgot-password, en activatie endpoints.
- [ ] **Email templates verbeteren** - Consistenter design, evt. met een template engine.

## Deployment checklist (leverancierstypen)

Wanneer klaar met testen op test-omgeving:
- [ ] `prisma db push` op productie-database (ancient-shadow)
- [ ] Merge `develop` → `main`
- [ ] Push `main` naar origin → deploy naar productie
- [ ] Verifieer productie-omgeving
