# TODO - Supplier Onboarding

## Kritiek (voor productie)

- [x] **Demo role switcher verwijderen** - Staat achter `NEXT_PUBLIC_DEMO_MODE` flag.
- [x] **`receiveEmails` veld daadwerkelijk checken** - Notificatie-emails checken `receiveEmails` per user. Activatie/reset/uitnodigings-emails worden altijd verstuurd.
- [x] **Hardcoded demo email-adressen vervangen** - Finance/ERP notificaties gaan nu dynamisch naar alle actieve users met die rol en `receiveEmails=true`.
- [x] **Demo credentials van login/dashboard pagina halen** - Staat achter `NEXT_PUBLIC_DEMO_MODE` flag.
- [ ] **Input validatie toevoegen** - Geen Zod schemas ondanks dat het in dependencies zit. Geen sanitization op user input (supplier form, admin forms, API routes). XSS/injection risico.

## Hoog (zou moeten)

- [ ] **Custom error pages maken** - Geen `error.tsx`, `not-found.tsx`, of `global-error.tsx`. Toont nu standaard Next.js errors.
- [x] **Settings/configuratie model** - Niet meer nodig: notificaties gaan nu dynamisch naar users op basis van rol + `receiveEmails`.
- [ ] **File upload validatie** - Geen controle op bestandsgrootte of MIME type bij uploads in `src/app/api/supplier/[token]/route.ts`.

## Medium (verbetering)

- [ ] **Middleware deprecation** - Next.js 16 geeft warning dat `middleware.ts` deprecated is en `proxy` gebruikt moet worden.
- [ ] **Nav interface opschonen** - `user.name` type in `src/components/dashboard/nav.tsx` interface is technisch correct (komt uit session) maar kan verwarrend zijn.
- [ ] **DEMO_EMAIL fallback verwijderen** - Hardcoded fallback email in `src/lib/email.ts` zou in productie expliciet moeten falen.
- [x] **Git push** - Alles is gepusht.

## Nice to have

- [ ] **Audit logging voor admin acties** - User CRUD acties worden niet gelogd in de AuditLog tabel.
- [ ] **Pagination** - Gebruikers- en aanvragentabellen laden alles in een keer.
- [ ] **Wachtwoord-sterkte eisen** - Nu alleen minimaal 6 tekens.
- [ ] **Rate limiting** - Op login, forgot-password, en activatie endpoints.
- [ ] **Email templates verbeteren** - Consistenter design, evt. met een template engine.
