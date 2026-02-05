# Deployment Handleiding - Vercel + Neon

Deze handleiding beschrijft stap-voor-stap hoe je de Supplier Onboarding applicatie deployt naar Vercel met een Neon PostgreSQL database.

---

## Vereisten

- GitHub account (voor code repository)
- Vercel account (gratis: vercel.com)
- Neon account (gratis: neon.tech)

---

## Stap 1: Code naar GitHub pushen

Als je nog geen Git repository hebt:

```bash
cd supplier-onboarding
git init
git add .
git commit -m "Initial commit"
```

Maak een nieuwe repository op GitHub en push:

```bash
git remote add origin https://github.com/JOUW-USERNAME/supplier-onboarding.git
git branch -M main
git push -u origin main
```

---

## Stap 2: Neon Database aanmaken

1. Ga naar [neon.tech](https://neon.tech) en maak een account aan
2. Klik op **"Create a project"**
3. Geef het project een naam (bijv. "supplier-onboarding")
4. Kies een regio dicht bij je gebruikers (bijv. "Europe (Frankfurt)")
5. Klik op **"Create project"**

### Connection strings ophalen

Na het aanmaken zie je het dashboard. Kopieer de volgende connection strings:

1. **Connection string** (met pooling) → Dit wordt `DATABASE_URL`
   - Klik op "Connection string"
   - Kies "Pooled connection"
   - Kopieer de string (begint met `postgresql://...`)

2. **Direct connection** → Dit wordt `DIRECT_URL`
   - Klik op "Connection string"
   - Kies "Direct connection"
   - Kopieer de string

**Let op:** Bewaar deze strings veilig, ze bevatten je wachtwoord!

---

## Stap 3: Vercel Project aanmaken

1. Ga naar [vercel.com](https://vercel.com) en log in
2. Klik op **"Add New Project"**
3. Klik op **"Import Git Repository"**
4. Selecteer je `supplier-onboarding` repository
5. Vercel detecteert automatisch dat het een Next.js project is

### Environment Variables configureren

Voordat je deployt, configureer de environment variables:

Klik op **"Environment Variables"** en voeg toe:

| Naam | Waarde | Notities |
|------|--------|----------|
| `DATABASE_URL` | `postgresql://...` | Neon pooled connection string |
| `DIRECT_URL` | `postgresql://...` | Neon direct connection string |
| `NEXTAUTH_SECRET` | `random-string-min-32-chars` | Genereer met: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://jouw-app.vercel.app` | Je Vercel URL (update na eerste deploy) |
| `DEMO_EMAIL` | `henk.pieter.den.boer@coloriginz.com` | Alle demo emails gaan hierheen |
| `SMTP_HOST` | `smtp.ethereal.email` | Ethereal voor testing |
| `SMTP_PORT` | `587` | |
| `SMTP_USER` | `xxx@ethereal.email` | Je Ethereal credentials |
| `SMTP_PASS` | `xxx` | Je Ethereal wachtwoord |
| `APP_URL` | `https://jouw-app.vercel.app` | Zelfde als NEXTAUTH_URL |

---

## Stap 4: Vercel Blob Storage toevoegen

Voor file uploads heb je Vercel Blob nodig:

1. In je Vercel project, ga naar **"Storage"** tab
2. Klik op **"Create Database"**
3. Selecteer **"Blob"**
4. Klik op **"Create"**
5. Vercel voegt automatisch `BLOB_READ_WRITE_TOKEN` toe aan je environment variables

---

## Stap 5: Database migratie uitvoeren

Na de eerste deployment moet je de database tabellen aanmaken:

### Optie A: Via Vercel CLI (aanbevolen)

```bash
# Installeer Vercel CLI als je die nog niet hebt
npm i -g vercel

# Login bij Vercel
vercel login

# Link je lokale project aan Vercel
vercel link

# Pull environment variables
vercel env pull .env.local

# Voer migratie uit
npx prisma migrate deploy

# Seed de database met demo gebruikers
npx prisma db seed
```

### Optie B: Lokaal met Neon credentials

1. Maak lokaal een `.env.local` bestand:

```env
DATABASE_URL="postgresql://... (je Neon pooled URL)"
DIRECT_URL="postgresql://... (je Neon direct URL)"
```

2. Voer migraties uit:

```bash
npx prisma migrate deploy
npx prisma db seed
```

---

## Stap 6: Deploy!

1. Ga terug naar Vercel
2. Klik op **"Deploy"**
3. Wacht tot de build klaar is
4. Je app is nu live op `https://jouw-project.vercel.app`

### Na eerste deploy

Update `NEXTAUTH_URL` en `APP_URL` in Vercel met je daadwerkelijke URL:

1. Ga naar **Settings** → **Environment Variables**
2. Update `NEXTAUTH_URL` naar je Vercel URL
3. Update `APP_URL` naar dezelfde URL
4. Klik op **"Redeploy"** om de wijzigingen te activeren

---

## Stap 7: Testen

1. Ga naar je Vercel URL
2. Log in met een van de demo accounts:
   - **Inkoper:** inkoper@demo.nl / demo123
   - **Finance:** finance@demo.nl / demo123
   - **ERP:** erp@demo.nl / demo123
3. Test de volledige flow

---

## Troubleshooting

### "Database connection error"

- Controleer of `DATABASE_URL` en `DIRECT_URL` correct zijn
- Zorg dat de Neon database actief is (niet gepauzeerd)

### "NEXTAUTH_URL mismatch"

- Zorg dat `NEXTAUTH_URL` exact overeenkomt met je Vercel URL
- Inclusief `https://` en zonder trailing slash

### "File upload fails"

- Controleer of Vercel Blob Storage is toegevoegd
- Check of `BLOB_READ_WRITE_TOKEN` aanwezig is in environment variables

### "Emails worden niet verstuurd"

- Controleer Ethereal credentials
- Check de Ethereal inbox op https://ethereal.email/login

---

## Custom Domain (optioneel)

Om een eigen domein te gebruiken:

1. Ga naar **Settings** → **Domains** in Vercel
2. Voeg je domein toe
3. Volg de DNS instructies
4. Update `NEXTAUTH_URL` en `APP_URL` naar je nieuwe domein

---

## Kosten

Met de gratis tiers:

| Service | Gratis limiet |
|---------|---------------|
| **Vercel** | 100GB bandwidth/maand, unlimited deploys |
| **Neon** | 0.5GB storage, 1 database |
| **Vercel Blob** | 1GB storage |

Dit is ruim voldoende voor demo/testing doeleinden.

---

## Volgende stappen

Voor productie-gebruik overweeg:

1. **Echte SMTP server** - SendGrid, Mailgun, of Azure Communication Services
2. **Azure AD integratie** - Voor SSO met bedrijfsaccounts
3. **Monitoring** - Vercel Analytics of Sentry voor error tracking
4. **Backup** - Neon heeft automatische backups, maar overweeg extra backups

---

## Hulp nodig?

- Vercel docs: https://vercel.com/docs
- Neon docs: https://neon.tech/docs
- Next.js docs: https://nextjs.org/docs
- Prisma docs: https://www.prisma.io/docs
