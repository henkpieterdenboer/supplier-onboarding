import nodemailer from 'nodemailer'
import { LOGO_BASE64 } from './logo-base64'

// Email header with logo
const EMAIL_HEADER = `
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #e5e7eb; margin-bottom: 20px;">
    <img src="${LOGO_BASE64}" alt="Logo" style="height: 60px; width: auto;" />
  </div>
`

// In demo mode, all emails go to a single address
const DEMO_EMAIL = process.env.DEMO_EMAIL
const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && !!DEMO_EMAIL
const APP_URL = process.env.APP_URL || 'http://localhost:3000'

// Create transporter (configure for your SMTP server)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<string | null> {
  try {
    if (IS_DEMO_MODE) {
      // In demo mode, all emails go to the demo address with the original recipient shown in the body
      const demoHtml = `
        <div style="background-color: #f0f0f0; padding: 20px; margin-bottom: 20px; border-radius: 8px;">
          <strong>DEMO MODUS</strong><br>
          Oorspronkelijke ontvanger: <strong>${to}</strong>
        </div>
        ${EMAIL_HEADER}
        ${html}
      `

      const info = await transporter.sendMail({
        from: '"Supplier Onboarding" <noreply@supplier-onboarding.local>',
        to: DEMO_EMAIL!,
        subject: `[DEMO] ${subject}`,
        html: demoHtml,
      })
      console.log(`Email sent to ${DEMO_EMAIL} (original: ${to})`)

      // Return Ethereal preview URL if available
      const previewUrl = nodemailer.getTestMessageUrl(info)
      return previewUrl || null
    } else {
      // Production: send to actual recipient
      const fullHtml = `${EMAIL_HEADER}${html}`

      await transporter.sendMail({
        from: '"Supplier Onboarding" <noreply@supplier-onboarding.local>',
        to,
        subject,
        html: fullHtml,
      })
      console.log(`Email sent to ${to}`)
      return null
    }
  } catch (error) {
    console.error('Failed to send email:', error)
    // Don't throw - email failures shouldn't block the process
    return null
  }
}

// Invitation email to supplier
interface InvitationEmailOptions {
  to: string
  supplierName: string
  invitationToken: string
  expiresAt: Date
}

export async function sendInvitationEmail({
  to,
  supplierName,
  invitationToken,
  expiresAt,
}: InvitationEmailOptions): Promise<string | null> {
  const invitationUrl = `${APP_URL}/supplier/${invitationToken}`

  return sendEmail({
    to,
    subject: 'Uitnodiging voor Supplier Onboarding',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welkom bij Supplier Onboarding</h2>
        <p>Beste ${supplierName},</p>
        <p>U bent uitgenodigd om uw bedrijfsgegevens in te vullen voor onze leveranciersregistratie.</p>
        <p>Klik op de onderstaande knop om te beginnen:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${invitationUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Formulier invullen
          </a>
        </p>
        <p><strong>Let op:</strong> Deze link is geldig tot ${expiresAt.toLocaleDateString('nl-NL')}.</p>
        <p>Als u vragen heeft, neem dan contact op met uw contactpersoon.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Dit is een automatisch gegenereerde email. Niet op reageren.
        </p>
      </div>
    `,
  })
}

// Confirmation email to supplier after submission
interface ConfirmationEmailOptions {
  to: string
  supplierName: string
}

export async function sendSupplierConfirmationEmail({
  to,
  supplierName,
}: ConfirmationEmailOptions) {
  await sendEmail({
    to,
    subject: 'Bevestiging: Uw gegevens zijn ontvangen',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Gegevens ontvangen</h2>
        <p>Beste ${supplierName},</p>
        <p>Bedankt voor het invullen van uw gegevens. Wij hebben uw aanvraag ontvangen.</p>
        <p>Uw gegevens worden nu beoordeeld door onze inkoopafdeling. U ontvangt bericht wanneer het proces is afgerond.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Dit is een automatisch gegenereerde email. Niet op reageren.
        </p>
      </div>
    `,
  })
}

// Notification to purchaser when supplier submits
interface PurchaserNotificationEmailOptions {
  to: string
  purchaserName: string
  supplierName: string
  requestId: string
}

export async function sendPurchaserNotificationEmail({
  to,
  purchaserName,
  supplierName,
  requestId,
}: PurchaserNotificationEmailOptions) {
  const requestUrl = `${APP_URL}/requests/${requestId}/edit`

  await sendEmail({
    to,
    subject: `Leverancier ${supplierName} heeft gegevens ingevuld`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Actie vereist: Leveranciergegevens reviewen</h2>
        <p>Beste ${purchaserName},</p>
        <p>Leverancier <strong>${supplierName}</strong> heeft zijn gegevens ingevuld.</p>
        <p>Klik op de onderstaande knop om de gegevens te bekijken en aan te vullen:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${requestUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Gegevens bekijken
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Dit is een automatisch gegenereerde email. Niet op reageren.
        </p>
      </div>
    `,
  })
}

// Notification to Finance
interface FinanceNotificationEmailOptions {
  to: string
  supplierName: string
  requestId: string
}

export async function sendFinanceNotificationEmail({
  to,
  supplierName,
  requestId,
}: FinanceNotificationEmailOptions) {
  const requestUrl = `${APP_URL}/requests/${requestId}`

  await sendEmail({
    to,
    subject: `Leverancier ${supplierName} - Wachten op Finance`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Actie vereist: Crediteurnummer invullen</h2>
        <p>Beste Finance team,</p>
        <p>De leveranciersaanvraag voor <strong>${supplierName}</strong> is klaar voor verwerking.</p>
        <p>Vul het crediteurnummer in om door te gaan:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${requestUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Aanvraag verwerken
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Dit is een automatisch gegenereerde email. Niet op reageren.
        </p>
      </div>
    `,
  })
}

// Notification to ERP
interface ERPNotificationEmailOptions {
  to: string
  supplierName: string
  requestId: string
}

export async function sendERPNotificationEmail({
  to,
  supplierName,
  requestId,
}: ERPNotificationEmailOptions) {
  const requestUrl = `${APP_URL}/requests/${requestId}`

  await sendEmail({
    to,
    subject: `Leverancier ${supplierName} - Wachten op ERP`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Actie vereist: KBT-code invullen</h2>
        <p>Beste ERP team,</p>
        <p>De leveranciersaanvraag voor <strong>${supplierName}</strong> is klaar voor verwerking in ERP.</p>
        <p>Vul de KBT-code in om de registratie af te ronden:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${requestUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Aanvraag verwerken
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Dit is een automatisch gegenereerde email. Niet op reageren.
        </p>
      </div>
    `,
  })
}

// Completion email to Finance and Purchaser
interface CompletionEmailOptions {
  financeEmails: string[]
  purchaserEmail: string | null
  purchaserName: string
  supplierName: string
  requestId: string
  creditorNumber: string
  kbtCode: string
}

export async function sendCompletionEmail({
  financeEmails,
  purchaserEmail,
  purchaserName,
  supplierName,
  requestId,
  creditorNumber,
  kbtCode,
}: CompletionEmailOptions) {
  const requestUrl = `${APP_URL}/requests/${requestId}`

  // Email to Finance users
  for (const financeEmail of financeEmails) {
    await sendEmail({
      to: financeEmail,
      subject: `Leverancier ${supplierName} - Registratie voltooid`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Leveranciersregistratie voltooid</h2>
        <p>Beste Finance team,</p>
        <p>De leveranciersregistratie voor <strong>${supplierName}</strong> is volledig afgerond.</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Crediteurnummer:</strong> ${creditorNumber}</p>
          <p style="margin: 8px 0 0 0;"><strong>KBT-code:</strong> ${kbtCode}</p>
        </div>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${requestUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Aanvraag bekijken
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Dit is een automatisch gegenereerde email. Niet op reageren.
        </p>
      </div>
    `,
    })
  }

  // Email to Purchaser
  if (purchaserEmail) {
    await sendEmail({
      to: purchaserEmail,
      subject: `Leverancier ${supplierName} - Registratie voltooid`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Leveranciersregistratie voltooid</h2>
          <p>Beste ${purchaserName},</p>
          <p>De leveranciersregistratie voor <strong>${supplierName}</strong> die u heeft aangevraagd, is volledig afgerond.</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Crediteurnummer:</strong> ${creditorNumber}</p>
            <p style="margin: 8px 0 0 0;"><strong>KBT-code:</strong> ${kbtCode}</p>
          </div>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${requestUrl}"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Aanvraag bekijken
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            Dit is een automatisch gegenereerde email. Niet op reageren.
          </p>
        </div>
      `,
    })
  }
}

// Activation email for new users
interface ActivationEmailOptions {
  to: string
  firstName: string
  activationToken: string
  expiresAt: Date
}

export async function sendActivationEmail({
  to,
  firstName,
  activationToken,
  expiresAt,
}: ActivationEmailOptions) {
  const activationUrl = `${APP_URL}/activate/${activationToken}`

  await sendEmail({
    to,
    subject: 'Activeer uw account - Supplier Onboarding',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welkom bij Supplier Onboarding</h2>
        <p>Beste ${firstName},</p>
        <p>Er is een account voor u aangemaakt. Klik op de onderstaande knop om uw wachtwoord in te stellen en uw account te activeren:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${activationUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Account activeren
          </a>
        </p>
        <p><strong>Let op:</strong> Deze link is geldig tot ${expiresAt.toLocaleDateString('nl-NL')}.</p>
        <p>Als u deze aanvraag niet herkent, kunt u deze email negeren.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Dit is een automatisch gegenereerde email. Niet op reageren.
        </p>
      </div>
    `,
  })
}

// Password reset email
interface PasswordResetEmailOptions {
  to: string
  firstName: string
  resetToken: string
  expiresAt: Date
}

export async function sendPasswordResetEmail({
  to,
  firstName,
  resetToken,
  expiresAt,
}: PasswordResetEmailOptions) {
  const resetUrl = `${APP_URL}/reset-password/${resetToken}`

  await sendEmail({
    to,
    subject: 'Wachtwoord herstellen - Supplier Onboarding',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Wachtwoord herstellen</h2>
        <p>Beste ${firstName},</p>
        <p>Er is een verzoek ingediend om uw wachtwoord te herstellen. Klik op de onderstaande knop om een nieuw wachtwoord in te stellen:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Nieuw wachtwoord instellen
          </a>
        </p>
        <p><strong>Let op:</strong> Deze link is geldig tot ${expiresAt.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} (1 uur).</p>
        <p>Als u dit verzoek niet heeft gedaan, kunt u deze email negeren.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Dit is een automatisch gegenereerde email. Niet op reageren.
        </p>
      </div>
    `,
  })
}

// Reminder email
interface ReminderEmailOptions {
  to: string
  recipientName: string
  supplierName: string
  requestId: string
  role: 'supplier' | 'purchaser' | 'finance' | 'erp'
  invitationToken?: string
}

export async function sendReminderEmail({
  to,
  recipientName,
  supplierName,
  requestId,
  role,
  invitationToken,
}: ReminderEmailOptions) {
  let actionUrl: string
  let actionText: string

  if (role === 'supplier' && invitationToken) {
    actionUrl = `${APP_URL}/supplier/${invitationToken}`
    actionText = 'Formulier invullen'
  } else {
    actionUrl = `${APP_URL}/requests/${requestId}`
    actionText = 'Aanvraag bekijken'
  }

  await sendEmail({
    to,
    subject: `Herinnering: Leveranciersaanvraag ${supplierName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Herinnering</h2>
        <p>Beste ${recipientName},</p>
        <p>Dit is een herinnering voor de leveranciersaanvraag van <strong>${supplierName}</strong>.</p>
        <p>Er is actie van u vereist om het proces voort te zetten.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${actionUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            ${actionText}
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Dit is een automatisch gegenereerde email. Niet op reageren.
        </p>
      </div>
    `,
  })
}
