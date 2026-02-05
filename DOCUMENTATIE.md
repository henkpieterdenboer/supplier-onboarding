# Supplier Onboarding Applicatie

## Overzicht

Webapplicatie voor het faciliteren van het supplier-onboarding proces. De workflow loopt door meerdere afdelingen: Inkoop → Leverancier → Inkoop → Finance → ERP.

---

## Tech Stack

### Frontend

| Component | Technologie | Versie | Doel |
|-----------|-------------|--------|------|
| **Framework** | Next.js (App Router) | 16.1.6 | Full-stack React framework met server-side rendering |
| **Taal** | TypeScript | 5.x | Type-safety, betere IDE ondersteuning |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS framework |
| **UI Componenten** | shadcn/ui | - | Herbruikbare componenten (Button, Card, Table, Dialog, etc.) |
| **Excel Export** | xlsx | - | Exporteren van data naar Excel bestanden |

### Backend

| Component | Technologie | Versie | Doel |
|-----------|-------------|--------|------|
| **API Routes** | Next.js Route Handlers | - | REST API endpoints in `/api/` |
| **Database** | SQLite | - | Lokale database (geen aparte server nodig) |
| **ORM** | Prisma | 5.x | Database queries, migraties, type-safe models |
| **Authenticatie** | NextAuth.js | 4.x | Sessie-beheer, credentials provider |
| **Email** | Nodemailer | - | SMTP email verzending |
| **Wachtwoord Hashing** | bcryptjs | - | Veilige wachtwoord opslag |

### Development Tools

| Tool | Doel |
|------|------|
| **Ethereal Email** | Fake SMTP server voor testen van emails |
| **Sharp** | Image processing (logo transparantie) |

---

## Installatie

### Vereisten

- Node.js (v18 of hoger)
- npm

### Stappen

```bash
# 1. Ga naar de project directory
cd supplier-onboarding

# 2. Installeer dependencies
npm install

# 3. Configureer environment variables
# Kopieer .env.example naar .env en vul de waarden in

# 4. Database setup (migraties uitvoeren)
npx prisma migrate dev

# 5. Start de development server
npm run dev

# 6. Open http://localhost:3000 in je browser
```

### Environment Variables (.env)

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_SECRET="jouw-geheime-sleutel"
NEXTAUTH_URL="http://localhost:3000"

# Email (Ethereal voor testing)
SMTP_HOST="smtp.ethereal.email"
SMTP_PORT="587"
SMTP_USER="gebruiker@ethereal.email"
SMTP_PASS="wachtwoord"

# Demo modus - alle emails gaan naar dit adres
DEMO_EMAIL="henk.pieter.den.boer@coloriginz.com"

# App URL (voor links in emails)
APP_URL="http://localhost:3000"
```

---

## Demo Accounts

| Rol | Email | Wachtwoord |
|-----|-------|------------|
| Inkoper | inkoper@demo.nl | demo123 |
| Finance | finance@demo.nl | demo123 |
| ERP | erp@demo.nl | demo123 |

---

## Data Models

### User (Gebruikers)

| Veld | Type | Beschrijving |
|------|------|--------------|
| id | String | Unieke identifier |
| email | String | Email adres (uniek) |
| name | String | Naam |
| role | String | INKOPER, FINANCE, of ERP |
| passwordHash | String | Gehashed wachtwoord |

### SupplierRequest (Onboarding Aanvragen)

| Veld | Type | Beschrijving |
|------|------|--------------|
| id | String | Unieke identifier |
| status | String | Huidige status in workflow |
| createdById | String | Inkoper die aanvraag maakte |
| **Basis gegevens** | | |
| supplierName | String | Naam leverancier |
| supplierEmail | String | Email leverancier |
| region | String | EU of ROW |
| **NAW gegevens** | | |
| companyName | String | Bedrijfsnaam |
| address | String | Adres |
| postalCode | String | Postcode |
| city | String | Plaats |
| country | String | Land |
| contactName | String | Contactpersoon |
| contactPhone | String | Telefoonnummer |
| contactEmail | String | Contact email |
| **Financiële gegevens** | | |
| chamberOfCommerceNumber | String | KvK nummer |
| vatNumber | String | BTW nummer |
| iban | String | IBAN |
| bankName | String | Bank naam |
| **Inkoop velden** | | |
| incoterm | String | CIF of FOB |
| commissionPercentage | Decimal | Commissie percentage |
| **Finance velden** | | |
| creditorNumber | String | Crediteurnummer (uniek) |
| **ERP velden** | | |
| kbtCode | String | KBT-code (uniek) |
| **Uitnodiging** | | |
| invitationToken | String | Unieke token voor leverancier link |
| invitationExpiresAt | DateTime | Vervaldatum link (1 week) |
| invitationSentAt | DateTime | Wanneer uitnodiging verstuurd |

### SupplierFile (Uploads)

| Veld | Type | Beschrijving |
|------|------|--------------|
| id | String | Unieke identifier |
| requestId | String | Gekoppelde aanvraag |
| fileName | String | Originele bestandsnaam |
| fileType | String | KVK, PASSPORT, of OTHER |
| filePath | String | Pad naar opgeslagen bestand |
| uploadedBy | String | SUPPLIER of user ID |

### AuditLog (Audit Trail)

| Veld | Type | Beschrijving |
|------|------|--------------|
| id | String | Unieke identifier |
| requestId | String | Gekoppelde aanvraag |
| userId | String | Gebruiker (optioneel) |
| action | String | Type actie |
| details | String | JSON met details |
| createdAt | DateTime | Tijdstip |

---

## Workflow Statussen

```
┌─────────────────┐
│ INVITATION_SENT │ ← Inkoper maakt aanvraag, leverancier ontvangt link
└────────┬────────┘
         ▼
┌───────────────────┐
│ AWAITING_PURCHASER│ ← Leverancier heeft ingevuld, inkoper moet reviewen
└────────┬──────────┘
         ▼
┌─────────────────┐
│ AWAITING_FINANCE│ ← Inkoper heeft gesubmit, finance moet crediteurnr invullen
└────────┬────────┘
         ▼
┌──────────────┐
│ AWAITING_ERP │ ← Finance heeft gesubmit, ERP moet KBT-code invullen
└────────┬─────┘
         ▼
┌───────────┐
│ COMPLETED │ ← Proces afgerond
└───────────┘

Op elk moment kan status naar CANCELLED gezet worden.
```

---

## Pagina's & Routes

### Publiek

| Route | Beschrijving |
|-------|--------------|
| `/login` | Inlogpagina |
| `/supplier/[token]` | Formulier voor leverancier (geen login nodig) |

### Dashboard (ingelogd)

| Route | Beschrijving | Rollen |
|-------|--------------|--------|
| `/dashboard` | Overzicht alle aanvragen | Alle |
| `/requests/new` | Nieuwe aanvraag starten | INKOPER |
| `/requests/[id]` | Detail pagina aanvraag | Alle |
| `/requests/[id]/edit` | Bewerken aanvraag | Rol-afhankelijk |

### API Routes

| Route | Method | Beschrijving |
|-------|--------|--------------|
| `/api/auth/*` | - | NextAuth endpoints |
| `/api/requests` | GET | Lijst alle aanvragen |
| `/api/requests` | POST | Nieuwe aanvraag maken |
| `/api/requests/[id]` | GET | Enkele aanvraag ophalen |
| `/api/requests/[id]` | PATCH | Aanvraag bijwerken/acties |
| `/api/supplier/[token]` | GET | Aanvraag data voor leverancier |
| `/api/supplier/[token]` | POST | Leverancier submit formulier |

---

## Email Notificaties

Alle emails worden in demo-modus naar één adres gestuurd met de originele ontvanger in de body.

| Email | Ontvanger | Trigger |
|-------|-----------|---------|
| Uitnodiging | Leverancier | Inkoper maakt aanvraag |
| Bevestiging | Leverancier | Leverancier submit formulier |
| Notificatie | Inkoper | Leverancier heeft ingevuld |
| Notificatie | Finance | Inkoper heeft gesubmit |
| Notificatie | ERP | Finance heeft gesubmit |
| Herinnering | Huidige wachtende | Handmatig via dashboard |

---

## Bestandsstructuur

```
supplier-onboarding/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── dev.db                 # SQLite database
├── public/
│   └── logo.png               # Logo (transparant)
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (dashboard)/       # Authenticated pages
│   │   │   ├── dashboard/
│   │   │   └── requests/
│   │   ├── api/               # API routes
│   │   │   ├── auth/
│   │   │   ├── requests/
│   │   │   └── supplier/
│   │   ├── login/
│   │   └── supplier/[token]/  # Publieke leverancier pagina
│   ├── components/
│   │   ├── dashboard/         # Dashboard componenten
│   │   │   ├── nav.tsx
│   │   │   └── requests-table.tsx
│   │   ├── forms/             # Formulier componenten
│   │   └── ui/                # shadcn/ui componenten
│   ├── lib/
│   │   ├── auth.ts            # NextAuth configuratie
│   │   ├── db.ts              # Prisma client
│   │   ├── email.ts           # Email verzending
│   │   └── logo-base64.ts     # Logo als base64
│   └── types/
│       └── index.ts           # TypeScript types & constanten
├── uploads/                   # Geüploade bestanden
├── .env                       # Environment variables
├── package.json
└── DOCUMENTATIE.md            # Dit bestand
```

---

## Validaties

| Veld | Validatie |
|------|-----------|
| Leverancier naam + email | Check op duplicaat bij aanmaken |
| Crediteurnummer | Moet uniek zijn |
| KBT-code | Moet uniek zijn |
| Uitnodiging link | Verloopt na 1 week |

---

## Toekomstige Azure Migratie

| Lokaal | Azure Alternatief |
|--------|-------------------|
| SQLite | Azure SQL / PostgreSQL |
| Lokale file opslag (`/uploads`) | Azure Blob Storage |
| NextAuth credentials | Azure AD / Entra ID (SSO) |
| Ethereal email | Azure Communication Services / SendGrid |
| `npm run dev` | Azure App Service / Static Web Apps |

### Migratie stappen

1. **Database**: Wijzig `DATABASE_URL` in `.env` naar Azure SQL connection string
2. **Files**: Implementeer Azure Blob Storage adapter voor uploads
3. **Auth**: Voeg Azure AD provider toe aan NextAuth configuratie
4. **Email**: Configureer productie SMTP server
5. **Deploy**: Push naar Azure App Service of gebruik Azure Static Web Apps

---

## Troubleshooting

### Node.js niet gevonden

Als `npm` niet werkt, controleer of Node.js in je PATH staat:

```powershell
$env:Path = "C:\Users\[gebruiker]\AppData\Local\nodejs;" + $env:Path
```

### Database reset

```bash
# Verwijder database en maak opnieuw aan
rm prisma/dev.db
npx prisma migrate dev
```

### Email testen

Emails worden naar Ethereal gestuurd. Check de inbox op:
https://ethereal.email/login

---

## Contact

Voor vragen of problemen, neem contact op met de IT-afdeling.
