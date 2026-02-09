# TODO - Supplier Onboarding

## Kritiek (voor productie)

- [ ] **Demo role switcher verwijderen** - Staat nog in de nav (`src/components/dashboard/nav.tsx`), laat elke user zijn rol wijzigen naar ADMIN/FINANCE/etc. Moet weg of achter een environment flag (`DEMO_MODE`).
- [ ] **`receiveEmails` veld daadwerkelijk checken** - Het veld bestaat in de database en UI, maar de email service (`src/lib/email.ts`) checkt het nergens. Activatie/reset emails uitzonderlijk altijd sturen.
- [ ] **Hardcoded demo email-adressen vervangen** - `finance@demo.nl` en `erp@demo.nl` staan hardcoded in `src/app/api/requests/[id]/route.ts` voor notificaties. Moet dynamisch worden (bijv. Settings-model of alle users met die rol ophalen).
- [ ] **Demo credentials van login/dashboard pagina halen** - Wachtwoorden en Ethereal credentials staan zichtbaar op `src/app/login/page.tsx` en `src/app/(dashboard)/dashboard/page.tsx`. Achter een `DEMO_MODE` env var zetten.
- [ ] **Input validatie toevoegen** - Geen Zod schemas ondanks dat het in dependencies zit. Geen sanitization op user input (supplier form, admin forms, API routes). XSS/injection risico.

## Hoog (zou moeten)

- [ ] **Custom error pages maken** - Geen `error.tsx`, `not-found.tsx`, of `global-error.tsx`. Toont nu standaard Next.js errors.
- [ ] **Settings/configuratie model** - Voor team-emailadressen (Finance, ERP) en andere app-instellingen, zodat die via admin UI beheerd kunnen worden i.p.v. hardcoded.
- [ ] **File upload validatie** - Geen controle op bestandsgrootte of MIME type bij uploads in `src/app/api/supplier/[token]/route.ts`.

## Medium (verbetering)

- [ ] **Middleware deprecation** - Next.js 16 geeft warning dat `middleware.ts` deprecated is en `proxy` gebruikt moet worden.
- [ ] **Nav interface opschonen** - `user.name` type in `src/components/dashboard/nav.tsx` interface is technisch correct (komt uit session) maar kan verwarrend zijn.
- [ ] **DEMO_EMAIL fallback verwijderen** - Hardcoded fallback email in `src/lib/email.ts` zou in productie expliciet moeten falen.
- [ ] **Git push** - Laatste 2 commits staan nog lokaal, moeten nog naar GitHub/Vercel.

## Nice to have

- [ ] **Audit logging voor admin acties** - User CRUD acties worden niet gelogd in de AuditLog tabel.
- [ ] **Pagination** - Gebruikers- en aanvragentabellen laden alles in een keer.
- [ ] **Wachtwoord-sterkte eisen** - Nu alleen minimaal 6 tekens.
- [ ] **Rate limiting** - Op login, forgot-password, en activatie endpoints.
- [ ] **Email templates verbeteren** - Consistenter design, evt. met een template engine.
