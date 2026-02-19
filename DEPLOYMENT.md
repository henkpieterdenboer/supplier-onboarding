# Deployment Handleiding - Vercel + Neon

Deze handleiding beschrijft de deployment setup van de Supplier Onboarding applicatie op Vercel met Neon PostgreSQL databases.

---

## Architectuur

De applicatie draait op **1 Vercel project** met **2 deployment targets**, elk met een eigen **apart Neon project** (volledige database isolatie):

| Omgeving | URL | Branch | Neon Project | Demo Mode |
|----------|-----|--------|--------------|-----------|
| **Productie** | `col-supplier-onboarding.vercel.app` | `main` | ancient-shadow | Uit |
| **Test** | `col-supplier-onboarding-test.vercel.app` | `develop` | summer-wildflower | Aan |

---

## Vereisten

- GitHub account (code repository)
- Vercel account (vercel.com)
- Neon account (neon.tech) met twee projecten
- Resend account (resend.com) voor productie email

---

## Git & Deployment Workflow

Twee branches mappen naar twee Vercel deployments:

- `develop` wordt automatisch gedeployd naar **test**
- `main` wordt automatisch gedeployd naar **productie**

### Standaard flow (test eerst, dan promoten)

```bash
git checkout develop
# ... maak wijzigingen, commit ...
git push origin develop              # deployt automatisch naar test

# ... verifieer op test omgeving ...

git checkout main
git merge develop
git push origin main                 # deployt automatisch naar productie
git checkout develop
```

### Regels

- **Nooit** direct naar `main` pushen zonder expliciete goedkeuring
- Standaard werkbranch is `develop`
- Schema wijzigingen moeten apart tegen beide Neon databases uitgevoerd worden
- Na schema wijzigingen op productie: `npm run db:sync-test` om test DB te synchroniseren

---

## Neon Database Setup

### Twee aparte Neon projecten

1. **summer-wildflower** (test) - Europa regio
2. **ancient-shadow** (productie) - Europa regio

Elk project heeft twee connection strings nodig:

| Type | Gebruik | Hostname |
|------|---------|----------|
| **Pooled** (`DATABASE_URL`) | Applicatie verbindingen | Bevat `-pooler` in hostname |
| **Direct** (`DIRECT_URL`) | Prisma operaties | Zonder `-pooler` in hostname |

> **Let op:** `DATABASE_URL` moet `-pooler` in de hostname hebben, `DIRECT_URL` niet. Beide moeten naar het juiste Neon project wijzen per omgeving.

### Schema wijzigingen doorvoeren

```bash
# Tegen test database (standaard, .env wijst naar summer-wildflower)
npx prisma db push

# Tegen productie database (expliciet)
DATABASE_URL="postgresql://...ancient-shadow..." DIRECT_URL="postgresql://...ancient-shadow..." npx prisma db push
```

> **Belangrijk:** Gebruik NIET `prisma migrate dev` of `prisma migrate deploy`. Dit project gebruikt uitsluitend `prisma db push` voor schema wijzigingen.

### Database synchronisatie (productie naar test)

```bash
npm run db:sync-test
```

Dit script (`prisma/sync-test-db.ts`) leest `.env.production` (productie/ancient-shadow) en `.env` (test/summer-wildflower), kopieert alle data, en upsert de demo gebruikers.

---

## Vercel Configuratie

### Environment Variables per omgeving

Configureer deze in Vercel onder **Settings > Environment Variables**. Stel ze apart in voor Production en Preview:

| Variabele | Production | Preview/Test |
|-----------|------------|--------------|
| `DATABASE_URL` | ancient-shadow pooled URL | summer-wildflower pooled URL |
| `DIRECT_URL` | ancient-shadow direct URL | summer-wildflower direct URL |
| `NEXTAUTH_SECRET` | Unieke secret | Unieke secret |
| `NEXTAUTH_URL` | `https://col-supplier-onboarding.vercel.app` | `https://col-supplier-onboarding-test.vercel.app` |
| `APP_URL` | `https://col-supplier-onboarding.vercel.app` | `https://col-supplier-onboarding-test.vercel.app` |
| `NEXT_PUBLIC_DEMO_MODE` | (niet gezet) | `true` |
| `DEMO_EMAIL` | (niet gezet) | `henk.pieter.den.boer@coloriginz.com` |
| `RESEND_API_KEY` | Resend API key | Resend API key |
| `EMAIL_FROM` | `noreply@coloriginz.com` | `noreply@coloriginz.com` |
| `SMTP_HOST` | `smtp.resend.com` | `smtp.resend.com` |
| `SMTP_PORT` | `465` | `465` |
| `SMTP_USER` | `resend` | `resend` |
| `SMTP_PASS` | Resend API key | Resend API key |
| `BLOB_READ_WRITE_TOKEN` | (automatisch via Vercel Blob) | (automatisch via Vercel Blob) |

> **Kritiek:** `NEXTAUTH_URL` moet exact overeenkomen met de deployment URL (inclusief `https://`, zonder trailing slash). Verkeerde configuratie zorgt ervoor dat login stil faalt.

### Vercel Blob Storage

File uploads worden opgeslagen in Vercel Blob:

1. In je Vercel project, ga naar **Storage** tab
2. Klik op **Create Database** > **Blob**
3. Vercel voegt automatisch `BLOB_READ_WRITE_TOKEN` toe

Elke omgeving (Production/Preview) heeft eigen Blob storage.

### Vercel Build Configuratie

`vercel.json` zorgt ervoor dat `npx prisma generate` draait voor de build. Daarnaast draait `postinstall` in `package.json` ook `npx prisma generate`.

---

## Lokale Environment Bestanden

| Bestand | Wijst naar | Gebruik |
|---------|------------|---------|
| `.env` | Test DB (summer-wildflower) | Standaard voor `prisma db push`, `prisma studio` |
| `.env.production` | Productie DB (ancient-shadow) | Alleen door `db:sync-test` script |
| `.env.local` | (optioneel) | Overschrijft `.env` voor lokale dev |

---

## Eerste Setup (nieuw project)

### 1. Neon databases aanmaken

1. Ga naar [neon.tech](https://neon.tech)
2. Maak twee projecten aan (test + productie) in Europa regio
3. Kopieer de pooled en direct connection strings voor beide

### 2. Vercel project koppelen

1. Ga naar [vercel.com](https://vercel.com), importeer de GitHub repository
2. Configureer alle environment variables (zie tabel hierboven)
3. Voeg Vercel Blob Storage toe via de Storage tab

### 3. Database schema en seed

```bash
# Push schema naar test database
npx prisma db push

# Seed demo accounts
npm run db:seed

# Push schema naar productie database
DATABASE_URL="..." DIRECT_URL="..." npx prisma db push
```

### 4. Deploy

Push naar `develop` voor test, merge naar `main` voor productie. Vercel deployt automatisch.

---

## Demo Accounts (test omgeving)

| Rol | Email | Wachtwoord |
|-----|-------|------------|
| Admin | admin@demo.nl | demo123 |
| Inkoper | inkoper@demo.nl | demo123 |
| Finance | finance@demo.nl | demo123 |
| ERP | erp@demo.nl | demo123 |

---

## Azure AD SSO (optioneel)

Voor M365 Single Sign-On, configureer deze extra variabelen:

| Variabele | Beschrijving |
|-----------|--------------|
| `NEXT_PUBLIC_AZURE_AD_ENABLED` | `true` om SSO knop te tonen |
| `AZURE_AD_CLIENT_ID` | App registratie client ID |
| `AZURE_AD_CLIENT_SECRET` | App registratie client secret |
| `AZURE_AD_TENANT_ID` | Azure AD tenant ID |

Azure AD gebruikers worden automatisch geactiveerd bij eerste SSO login.

---

## Troubleshooting

### "Database connection error"

- Controleer of `DATABASE_URL` en `DIRECT_URL` correct zijn in Vercel env vars
- Zorg dat `DATABASE_URL` de `-pooler` variant bevat
- Controleer of het juiste Neon project wordt gebruikt per omgeving

### "NEXTAUTH_URL mismatch" / Login faalt stil

- `NEXTAUTH_URL` moet exact de deployment URL zijn
- Productie: `https://col-supplier-onboarding.vercel.app`
- Test: `https://col-supplier-onboarding-test.vercel.app`
- Geen trailing slash

### "File upload fails"

- Controleer of Vercel Blob Storage is toegevoegd
- Check of `BLOB_READ_WRITE_TOKEN` aanwezig is

### "Emails worden niet verstuurd"

- Controleer Resend API key en SMTP configuratie
- In demo modus: alle emails gaan naar `DEMO_EMAIL`
- Email fouten blokkeren nooit de workflow (worden gelogd)

### Windows EPERM bij Prisma generate

De dev server lockt de Prisma query engine DLL. Stop alle Node processen:

```bash
# Alle node processen stoppen, dan:
npx prisma generate
```

---

## Email Configuratie

### Productie (Resend SMTP)

- Provider: Resend (`smtp.resend.com:465`)
- Domein: `coloriginz.com` (geverifieerd met DKIM + SPF)
- From adres: `noreply@coloriginz.com`

### Demo/Test (Ethereal of Resend)

- In demo modus kan via de UI gewisseld worden tussen Ethereal en Resend
- Alle emails worden omgeleid naar `DEMO_EMAIL` met banner die originele ontvanger toont

---

## Hulp nodig?

- Vercel docs: https://vercel.com/docs
- Neon docs: https://neon.tech/docs
- Next.js docs: https://nextjs.org/docs
- Prisma docs: https://www.prisma.io/docs
- Resend docs: https://resend.com/docs
