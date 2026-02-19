# Supplier Onboarding Applicatie

## Overzicht

Webapplicatie voor het faciliteren van het supplier-onboarding proces. De workflow loopt door meerdere afdelingen: Inkoop (Inkoper) maakt aanvraag aan, Leverancier vult formulier in, Inkoper reviewt, Finance kent crediteurnummer toe, ERP kent KBT-code toe, en het proces is afgerond.

UI is in het **Nederlands**, code (variabelen, comments) is in het **Engels**.

> **Opmerking:** CLAUDE.md is de primaire technische documentatie voor AI-tooling. Dit bestand is een beknopt Nederlands overzicht.

---

## Tech Stack

### Frontend

| Component | Technologie | Versie | Doel |
|-----------|-------------|--------|------|
| **Framework** | Next.js (App Router) | 16.x | Full-stack React framework met server-side rendering |
| **Taal** | TypeScript | 5.x | Type-safety, strict mode |
| **UI** | React | 19.x | UI rendering |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS framework |
| **UI Componenten** | shadcn/ui | - | Herbruikbare componenten (new-york stijl, lucide icons) |
| **Toasts** | sonner | - | Notificatie toasts |
| **Excel Export** | xlsx | - | Exporteren van data naar Excel |
| **i18n** | Custom | - | NL/EN vertalingen via `src/lib/i18n.ts` + JSON bestanden |

### Backend

| Component | Technologie | Versie | Doel |
|-----------|-------------|--------|------|
| **API Routes** | Next.js Route Handlers | - | REST API endpoints in `/api/` |
| **Database** | PostgreSQL via Neon | - | Cloud database met WebSocket pooling |
| **ORM** | Prisma | 6.x | Database queries, type-safe models (`@prisma/adapter-neon`) |
| **Authenticatie** | NextAuth.js | 4.x | JWT strategie, credentials + optioneel Azure AD SSO |
| **Email** | Nodemailer | - | Twee providers: Ethereal (demo) en Resend SMTP (productie) |
| **File Storage** | Vercel Blob | - | Bestanden opslag in de cloud |
| **Validatie** | Zod | 4.x | Schema-validatie op alle API routes |
| **Wachtwoord Hashing** | bcryptjs | - | Veilige wachtwoord opslag |

---

## Installatie (lokaal)

### Vereisten

- Node.js (v18 of hoger)
- npm
- Toegang tot een Neon PostgreSQL database

### Stappen

```bash
# 1. Ga naar de project directory
cd supplier-onboarding-vercel

# 2. Installeer dependencies
npm install

# 3. Configureer environment variables
# Kopieer .env.example naar .env en vul de Neon database URLs in

# 4. Database schema pushen
npx prisma db push

# 5. Seed de database met demo accounts
npm run db:seed

# 6. Start de development server
npm run dev

# 7. Open http://localhost:3000 in je browser
```

### Belangrijke Commands

```bash
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint
npm run db:seed          # Seed demo accounts
npm run db:sync-test     # Sync productie naar test DB
npx prisma db push       # Push schema wijzigingen naar DB
npx prisma generate      # Regenereer Prisma client
npx prisma studio        # Open Prisma Studio DB browser
```

> **Belangrijk:** Gebruik NIET `prisma migrate dev`. Dit project gebruikt `prisma db push` voor schema wijzigingen.

### Environment Variables (.env)

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://...@...-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://...@....eu-west-2.aws.neon.tech/neondb?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="jouw-geheime-sleutel"
NEXTAUTH_URL="http://localhost:3000"

# Email
SMTP_HOST="smtp.ethereal.email"
SMTP_PORT="587"
SMTP_USER="gebruiker@ethereal.email"
SMTP_PASS="wachtwoord"

# Productie email (Resend SMTP)
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@coloriginz.com"

# Demo modus
NEXT_PUBLIC_DEMO_MODE="true"
DEMO_EMAIL="henk.pieter.den.boer@coloriginz.com"

# App URL (voor links in emails)
APP_URL="http://localhost:3000"

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_..."

# Optioneel: Azure AD SSO
NEXT_PUBLIC_AZURE_AD_ENABLED="true"
AZURE_AD_CLIENT_ID="..."
AZURE_AD_CLIENT_SECRET="..."
AZURE_AD_TENANT_ID="..."
```

---

## Demo Accounts

| Rol | Email | Wachtwoord |
|-----|-------|------------|
| Admin | admin@demo.nl | demo123 |
| Inkoper | inkoper@demo.nl | demo123 |
| Finance | finance@demo.nl | demo123 |
| ERP | erp@demo.nl | demo123 |

---

## Data Models

### User (Gebruikers)

| Veld | Type | Beschrijving |
|------|------|--------------|
| id | String (UUID) | Unieke identifier |
| email | String | Email adres (uniek) |
| firstName | String | Voornaam |
| middleName | String? | Tussenvoegsel (optioneel) |
| lastName | String | Achternaam |
| roles | String[] | Rollen: ADMIN, INKOPER, FINANCE, ERP (meerdere mogelijk) |
| labels | String[] | Merken: COLORIGINZ, PFC (default: COLORIGINZ) |
| passwordHash | String? | Gehashed wachtwoord |
| isActive | Boolean | Account actief (default: false) |
| receiveEmails | Boolean | Email notificaties ontvangen (default: true) |
| preferredLanguage | String | Voorkeurstaal: nl of en (default: nl) |
| activationToken | String? | Token voor account activatie / wachtwoord reset |
| activationExpiresAt | DateTime? | Vervaldatum activatietoken |

> **Let op:** Gebruik altijd `formatUserName()` uit `@/lib/user-utils.ts` om de volledige naam samen te stellen.

### SupplierRequest (Onboarding Aanvragen)

| Veld | Type | Beschrijving |
|------|------|--------------|
| id | String (UUID) | Unieke identifier |
| status | String | Workflow status |
| createdById | String | Inkoper die aanvraag maakte |
| supplierType | String | KOOP, X_KWEKER, of O_KWEKER |
| label | String | Merk: COLORIGINZ of PFC |
| selfFill | Boolean | Inkoper vult zelf het formulier in |
| supplierLanguage | String | Taal voor leverancier formulier/emails (nl/en) |
| **Basis gegevens** | | |
| supplierName | String | Naam leverancier |
| supplierEmail | String | Email leverancier |
| region | String | EU of ROW |
| **NAW gegevens** | | |
| companyName | String? | Bedrijfsnaam |
| address | String? | Adres |
| postalCode | String? | Postcode |
| city | String? | Plaats |
| country | String? | Land |
| contactName | String? | Contactpersoon |
| contactPhone | String? | Telefoonnummer |
| contactEmail | String? | Contact email |
| **Zakelijke gegevens** | | |
| chamberOfCommerceNumber | String? | KvK nummer |
| vatNumber | String? | BTW nummer |
| iban | String? | IBAN |
| bankName | String? | Bank naam |
| glnNumber | String? | GLN nummer |
| **Financiele gegevens (Koop + O-kweker)** | | |
| invoiceEmail | String? | Factuur email |
| invoiceAddress | String? | Factuur adres |
| invoicePostalCode | String? | Factuur postcode |
| invoiceCity | String? | Factuur plaats |
| invoiceCurrency | String? | Factuur valuta |
| **Directeur (Koop + O-kweker, alleen ROW)** | | |
| directorName | String? | Naam directeur |
| directorFunction | String? | Functie directeur |
| directorDateOfBirth | String? | Geboortedatum |
| directorPassportNumber | String? | Paspoortnummer |
| **Inkoop velden** | | |
| incoterm | String? | CIF of FOB (verplicht voor Koop/O-kweker) |
| commissionPercentage | Float? | Commissie percentage |
| paymentTerm | String? | Betalingstermijn: 14 of 30 dagen |
| accountManager | String? | Accountmanager |
| **Veiling velden (X-kweker)** | | |
| auctionNumberRFH | String? | Veilingnummer RFH |
| salesSheetEmail | String? | Salessheet email |
| mandateRFH | Boolean? | Mandaat RFH |
| apiKeyFloriday | String? | API key Floriday |
| **Finance velden** | | |
| creditorNumber | String? | Crediteurnummer (uniek) |
| **ERP velden** | | |
| kbtCode | String? | KBT-code (uniek) |
| **VIES validatie** | | |
| vatValid | Boolean? | BTW nummer geldig (VIES check) |
| vatCheckResponse | String? | JSON response van VIES |
| vatCheckedAt | DateTime? | Tijdstip VIES check |
| **Uitnodiging** | | |
| invitationToken | String? | Unieke token voor leverancier link |
| invitationExpiresAt | DateTime? | Vervaldatum link (14 dagen) |
| invitationSentAt | DateTime? | Wanneer uitnodiging verstuurd |
| **Timestamps** | | |
| supplierSubmittedAt | DateTime? | Wanneer leverancier heeft ingestuurd |
| supplierSavedAt | DateTime? | Wanneer leverancier tussentijds heeft opgeslagen |

### SupplierFile (Uploads)

| Veld | Type | Beschrijving |
|------|------|--------------|
| id | String (UUID) | Unieke identifier |
| requestId | String | Gekoppelde aanvraag |
| fileName | String | Originele bestandsnaam |
| fileType | String | KVK, PASSPORT, BANK_DETAILS, of OTHER |
| filePath | String | URL naar Vercel Blob |
| uploadedById | String? | Gebruiker ID (null bij leverancier upload) |

> Bestanden worden opgeslagen in Vercel Blob Storage. Max 10MB, alleen PDF/JPG/PNG. Cascade-delete met de aanvraag.

### AuditLog (Audit Trail)

| Veld | Type | Beschrijving |
|------|------|--------------|
| id | String (UUID) | Unieke identifier |
| requestId | String | Gekoppelde aanvraag |
| userId | String? | Gebruiker (optioneel) |
| action | String | Type actie (INVITATION_SENT, SUPPLIER_SUBMITTED, STATUS_CHANGED, VIES_CHECKED, etc.) |
| details | String? | JSON met details |
| createdAt | DateTime | Tijdstip |

---

## Leverancierstypen

| Type | Beschrijving | Formulier |
|------|--------------|-----------|
| **KOOP** | Koop leverancier | Financiele gegevens, directeur (ROW), bankgegevens upload |
| **X_KWEKER** | X-kweker | Veilingvelden, geen financiele/directeur/bank upload |
| **O_KWEKER** | O-kweker | Identiek aan Koop |

Sectie-visibility wordt bepaald door helper functies in `src/lib/supplier-type-utils.ts`.

---

## Workflow Statussen

```
                              INVITATION_SENT
                                    |
                    Leverancier vult formulier in
                                    v
                            AWAITING_PURCHASER
                                    |
                      Inkoper reviewt en submit
                                    v
                            AWAITING_FINANCE
                                    |
                    Finance vult crediteurnummer in
                                    v
                              AWAITING_ERP
                                    |
                        ERP vult KBT-code in
                                    v
                               COMPLETED

     Elke status kan naar CANCELLED (en CANCELLED kan heropend worden)
```

---

## Pagina's & Routes

### Publiek

| Route | Beschrijving |
|-------|--------------|
| `/login` | Inlogpagina (credentials + optioneel Azure AD SSO) |
| `/activate/[token]` | Account activatie |
| `/forgot-password` | Wachtwoord vergeten |
| `/reset-password/[token]` | Wachtwoord resetten |
| `/supplier/[token]` | Formulier voor leverancier (geen login nodig) |

### Dashboard (ingelogd)

| Route | Beschrijving | Rollen |
|-------|--------------|--------|
| `/dashboard` | Overzicht alle aanvragen | Alle |
| `/requests/new` | Nieuwe aanvraag starten | INKOPER |
| `/requests/[id]` | Detail pagina aanvraag | Alle (label-check) |
| `/admin/users` | Gebruikersbeheer | ADMIN |

### API Routes

| Route | Method | Beschrijving |
|-------|--------|--------------|
| `/api/auth/*` | - | NextAuth endpoints |
| `/api/requests` | GET | Lijst alle aanvragen (gefilterd op labels) |
| `/api/requests` | POST | Nieuwe aanvraag maken |
| `/api/requests/[id]` | GET | Enkele aanvraag ophalen |
| `/api/requests/[id]` | PATCH | Aanvraag bijwerken/acties |
| `/api/requests/[id]/exact-xml` | GET | Exact Globe XML export |
| `/api/supplier/[token]` | GET | Aanvraag data voor leverancier |
| `/api/supplier/[token]` | POST | Leverancier submit/save formulier |
| `/api/files/[id]` | GET/DELETE | Bestand ophalen/verwijderen |
| `/api/admin/users` | GET/POST | Gebruikers ophalen/aanmaken |
| `/api/admin/users/[id]` | PATCH/DELETE | Gebruiker bijwerken/verwijderen |
| `/api/vies` | POST | VIES BTW-nummer validatie |
| `/api/email-provider` | GET/POST | Email provider toggle (demo) |
| `/api/user/language` | POST | Voorkeurstaal instellen |

---

## Labels (Merken)

Twee merken: **COLORIGINZ** (default) en **PFC**.

- Gebruikers hebben `labels: String[]` (bepaalt welke aanvragen ze zien)
- Aanvragen hebben `label: String` (bepaalt logo in formulier en emails)
- Dashboard filtert automatisch op gebruikers labels
- API routes en pagina's controleren label-autorisatie

---

## Email Notificaties

Twee email providers: **Ethereal** (demo/test) en **Resend SMTP** (productie, domein: coloriginz.com). In demo modus worden alle emails omgeleid naar `DEMO_EMAIL`. Emails blokkeren nooit de workflow.

Alle emails ondersteunen NL/EN via het i18n systeem.

| Email | Ontvanger | Trigger |
|-------|-----------|---------|
| Uitnodiging | Leverancier | Inkoper maakt aanvraag |
| Opslaan bevestiging | Leverancier | Leverancier slaat tussentijds op |
| Bevestiging | Leverancier | Leverancier submit formulier |
| Notificatie | Inkoper(s) | Leverancier heeft ingevuld |
| Notificatie | Finance gebruikers | Inkoper heeft gesubmit |
| Notificatie | ERP gebruikers | Finance heeft gesubmit |
| Herinnering | Huidige wachtende | Handmatig via dashboard |
| Account activatie | Nieuwe gebruiker | Admin maakt account aan |
| Wachtwoord reset | Gebruiker | Via wachtwoord vergeten |

---

## Bestandsstructuur

```
supplier-onboarding-vercel/
├── prisma/
│   ├── schema.prisma          # Database schema (PostgreSQL/Neon)
│   ├── seed.ts                # Demo data seeder
│   └── sync-test-db.ts        # Productie naar test sync script
├── public/
│   ├── logo-coloriginz.png    # Coloriginz logo
│   └── logo-pfc.png           # PFC logo
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (dashboard)/       # Authenticated pages
│   │   │   ├── dashboard/
│   │   │   ├── requests/
│   │   │   └── admin/
│   │   ├── api/               # API routes
│   │   │   ├── auth/
│   │   │   ├── requests/
│   │   │   ├── supplier/
│   │   │   ├── admin/
│   │   │   ├── files/
│   │   │   ├── vies/
│   │   │   └── email-provider/
│   │   ├── login/
│   │   ├── activate/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   └── supplier/[token]/  # Publieke leverancier pagina
│   ├── components/
│   │   ├── dashboard/         # Dashboard componenten (nav, stats, tables)
│   │   ├── requests/          # Aanvraag detail componenten
│   │   ├── providers/         # SessionProvider wrapper
│   │   ├── demo-banner.tsx    # Demo modus banner
│   │   └── ui/                # shadcn/ui componenten
│   ├── lib/
│   │   ├── auth.ts            # NextAuth configuratie
│   │   ├── db.ts              # Prisma client (Neon adapter)
│   │   ├── email.ts           # Email verzending (Ethereal + Resend)
│   │   ├── validations.ts     # Zod schema's voor API validatie
│   │   ├── i18n.ts            # Vertaalfuncties
│   │   ├── i18n-context.tsx   # React Language context
│   │   ├── exact-xml.ts       # Exact Globe XML export
│   │   ├── vies.ts            # VIES BTW-nummer validatie
│   │   ├── label-config.ts    # Label/merk configuratie
│   │   ├── supplier-type-utils.ts  # Leverancierstype helpers
│   │   └── user-utils.ts      # User naam formatting
│   ├── translations/
│   │   ├── nl.json            # Nederlandse vertalingen
│   │   └── en.json            # Engelse vertalingen
│   ├── types/
│   │   └── index.ts           # TypeScript types & enums
│   └── middleware.ts          # Route bescherming
├── .env                       # Test database (Neon summer-wildflower)
├── .env.production            # Productie database URLs (voor sync script)
├── .env.example               # Voorbeeld environment variables
├── vercel.json                # Vercel build configuratie
├── CLAUDE.md                  # AI tooling documentatie (primair)
├── DOCUMENTATIE.md            # Dit bestand
├── DEPLOYMENT.md              # Deployment handleiding
└── package.json
```

---

## Validaties

| Veld | Validatie |
|------|-----------|
| Alle API input | Zod schema validatie (enums, email, string lengtes) |
| Wachtwoord | Minimaal 8 tekens |
| Crediteurnummer | Moet uniek zijn |
| KBT-code | Moet uniek zijn |
| Uitnodiging link | Verloopt na 14 dagen |
| File uploads | Max 10MB, alleen PDF/JPG/PNG |
| Workflow transities | Status moet correct zijn (bijv. purchaser-submit vereist AWAITING_PURCHASER) |
| BTW-nummer | VIES validatie (EU) |

---

## Troubleshooting

### Windows EPERM bij Prisma generate

De dev server lockt de Prisma query engine DLL. Stop alle Node processen voordat je `npx prisma generate` of `npm install` uitvoert.

### Database wijzigingen

```bash
# Schema wijzigen in prisma/schema.prisma, dan:
npx prisma db push

# NIET gebruiken:
# npx prisma migrate dev  (werkt niet in dit project)
```

### Email testen

In demo modus gaan alle emails naar het `DEMO_EMAIL` adres. Toggle tussen Ethereal en Resend via de email provider dropdown in de UI.

---

## Contact

Voor vragen of problemen, neem contact op met de IT-afdeling.
