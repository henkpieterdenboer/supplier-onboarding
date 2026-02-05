# Supplier Onboarding Applicatie

Webapplicatie voor het faciliteren van het supplier-onboarding proces.

## Workflow

1. **Inkoper** maakt nieuwe leveranciersaanvraag aan
2. **Leverancier** vult formulier in via uitnodigingslink (of inkoper vult zelf in)
3. **Inkoper** reviewt en vult aanvullende gegevens in (CIF/FOB, commissie%)
4. **Finance** vult crediteurnummer in
5. **ERP** vult KBT-code in
6. **Compleet**

## Installatie

### Vereisten
- Node.js 18+
- npm

### Stappen

```bash
# Ga naar de project directory
cd supplier-onboarding

# Installeer dependencies
npm install

# Database setup (SQLite)
npx prisma migrate dev

# Seed demo accounts
npx prisma db seed

# Start development server
npm run dev
```

Open http://localhost:3000

## Demo Accounts

| Rol | Email | Wachtwoord |
|-----|-------|------------|
| Inkoper | inkoper@demo.nl | demo123 |
| Finance | finance@demo.nl | demo123 |
| ERP | erp@demo.nl | demo123 |

## Features

- Nieuwe leveranciersaanvraag aanmaken
- Uitnodigingsmail naar leverancier (1 week geldig)
- Leverancier formulier met file uploads (KvK, paspoort)
- Review en bewerken door inkoper
- Workflow door Finance en ERP
- Dashboard met overzicht alle aanvragen
- Filteren, zoeken en sorteren
- Excel export
- Audit trail per aanvraag
- Herinneringsmails
- Afbreken en heropenen van aanvragen
- Duplicate checks (naam/email, crediteurnummer, KBT-code)

## Email Configuratie

In demo-modus gaan alle emails naar: `henk.pieter.den.boer@coloriginz.com`

De oorspronkelijke ontvanger wordt in de email body getoond.

Voor productie, configureer SMTP in `.env`:
```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-password
```

## Technische Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: SQLite (Prisma ORM)
- **UI**: Tailwind CSS + shadcn/ui
- **Auth**: NextAuth.js
- **Email**: Nodemailer

## Project Structuur

```
src/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/        # Protected dashboard pages
│   ├── api/                # API routes
│   ├── login/              # Login page
│   └── supplier/           # Public supplier form
├── components/             # React components
│   ├── dashboard/          # Dashboard components
│   ├── requests/           # Request components
│   ├── providers/          # Context providers
│   └── ui/                 # shadcn/ui components
├── lib/                    # Utilities
│   ├── auth.ts             # NextAuth config
│   ├── db.ts               # Prisma client
│   └── email.ts            # Email service
└── types/                  # TypeScript types
```

## Statussen

| Status | Beschrijving |
|--------|--------------|
| INVITATION_SENT | Wachten op leverancier |
| AWAITING_PURCHASER | Wachten op inkoper |
| AWAITING_FINANCE | Wachten op finance |
| AWAITING_ERP | Wachten op ERP |
| COMPLETED | Compleet |
| CANCELLED | Afgebroken |

## Ontwikkeling

```bash
# Development server
npm run dev

# Build voor productie
npm run build

# Start productie server
npm start

# Database migratie
npm run db:migrate

# Database reset
npm run db:reset
```
