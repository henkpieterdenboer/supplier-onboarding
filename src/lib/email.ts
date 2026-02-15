import nodemailer from 'nodemailer'
import { cookies } from 'next/headers'
import { getTranslation, Language, formatDate, formatTime } from './i18n'
import { getLabelConfig } from './label-config'

// Generate email header with label-specific logo
function getEmailHeader(label?: string): string {
  const config = getLabelConfig(label || 'COLORIGINZ')
  const appUrl = process.env.APP_URL || 'http://localhost:3000'
  const logoUrl = `${appUrl}${config.logoPath}`
  return `
    <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #e5e7eb; margin-bottom: 20px;">
      <img src="${logoUrl}" alt="${config.name}" style="height: 60px; width: auto;" />
    </div>
  `
}

// In demo mode, all emails go to a single address
const DEMO_EMAIL = process.env.DEMO_EMAIL
const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && !!DEMO_EMAIL
const APP_URL = process.env.APP_URL || 'http://localhost:3000'
const EMAIL_FROM = process.env.EMAIL_FROM || '"Supplier Onboarding" <noreply@supplier-onboarding.local>'

type EmailProvider = 'ethereal' | 'resend'

/**
 * Determine which email provider to use.
 * - Production (non-demo): always uses SMTP_* env vars (which point to Resend in prod)
 * - Demo mode: reads cookie to toggle between Ethereal and Resend
 */
async function getEmailProvider(): Promise<EmailProvider> {
  if (!IS_DEMO_MODE) {
    // Production: always use whatever SMTP_* is configured (Resend in prod env)
    return 'resend'
  }

  try {
    const cookieStore = await cookies()
    const providerCookie = cookieStore.get('email-provider')
    if (providerCookie?.value === 'resend') {
      return 'resend'
    }
  } catch {
    // cookies() can fail outside of request context (e.g. build time)
  }

  return 'ethereal'
}

/**
 * Create a nodemailer transporter for the given provider.
 * - 'ethereal': uses SMTP_* env vars (defaults to smtp.ethereal.email)
 * - 'resend': uses Resend SMTP with RESEND_API_KEY
 */
function createTransporter(provider: EmailProvider) {
  if (provider === 'resend') {
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      // Use Resend SMTP
      return nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: {
          user: 'resend',
          pass: apiKey,
        },
      })
    }
    // Fallback: if no RESEND_API_KEY, try SMTP_* env vars (production Resend setup)
  }

  // Ethereal or fallback: use SMTP_* env vars
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  language?: Language
  label?: string
}

async function sendEmail({ to, subject, html, language, label }: SendEmailOptions): Promise<string | null> {
  try {
    const provider = await getEmailProvider()
    const transporter = createTransporter(provider)
    const fromAddress = provider === 'resend' ? EMAIL_FROM : '"Supplier Onboarding" <noreply@supplier-onboarding.local>'

    if (IS_DEMO_MODE) {
      // In demo mode, all emails go to the demo address with the original recipient shown in the body
      const providerLabel = provider === 'resend' ? 'Resend (echte mail)' : 'Ethereal (nep)'
      const demoHtml = `
        <div style="background-color: #f0f0f0; padding: 20px; margin-bottom: 20px; border-radius: 8px;">
          <strong>${getTranslation(language || 'nl', 'emails.demoMode.label')}</strong><br>
          ${getTranslation(language || 'nl', 'emails.demoMode.originalRecipient')} <strong>${to}</strong><br>
          ${getTranslation(language || 'nl', 'emails.demoMode.provider')} <strong>${providerLabel}</strong>
        </div>
        ${getEmailHeader(label)}
        ${html}
      `

      const info = await transporter.sendMail({
        from: fromAddress,
        to: DEMO_EMAIL!,
        subject: `[DEMO] ${subject}`,
        html: demoHtml,
      })
      console.log(`Email sent via ${provider} to ${DEMO_EMAIL} (original: ${to})`)

      // Return Ethereal preview URL only for Ethereal transport
      if (provider === 'ethereal') {
        const previewUrl = nodemailer.getTestMessageUrl(info)
        return previewUrl || null
      }
      return null
    } else {
      // Production: send to actual recipient
      const fullHtml = `${getEmailHeader(label)}${html}`

      await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html: fullHtml,
      })
      console.log(`Email sent via ${provider} to ${to}`)
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
  language: Language
  label?: string
}

export async function sendInvitationEmail({
  to,
  supplierName,
  invitationToken,
  expiresAt,
  language,
  label,
}: InvitationEmailOptions): Promise<string | null> {
  const t = (key: string, vars?: Record<string, string | number>) => getTranslation(language, key, vars)
  const invitationUrl = `${APP_URL}/supplier/${invitationToken}`

  return sendEmail({
    to,
    subject: t('emails.invitation.subject'),
    language,
    label,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${t('emails.invitation.title')}</h2>
        <p>${t('emails.invitation.greeting', { supplierName })}</p>
        <p>${t('emails.invitation.body')}</p>
        <p>${t('emails.invitation.cta')}</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${invitationUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            ${t('emails.invitation.button')}
          </a>
        </p>
        <p><strong>${t('emails.linkValid', { date: formatDate(expiresAt, language) })}</strong></p>
        <p>${t('emails.contactInfo')}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          ${t('emails.autoGenerated')}
        </p>
      </div>
    `,
  })
}

// Save email to supplier (continue later)
interface SupplierSaveEmailOptions {
  to: string
  supplierName: string
  invitationToken: string
  expiresAt: Date
  language: Language
  label?: string
}

export async function sendSupplierSaveEmail({
  to,
  supplierName,
  invitationToken,
  expiresAt,
  language,
  label,
}: SupplierSaveEmailOptions): Promise<string | null> {
  const t = (key: string, vars?: Record<string, string | number>) => getTranslation(language, key, vars)
  const invitationUrl = `${APP_URL}/supplier/${invitationToken}`

  return sendEmail({
    to,
    subject: t('emails.supplierSave.subject'),
    language,
    label,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${t('emails.supplierSave.title')}</h2>
        <p>${t('emails.supplierSave.greeting', { supplierName })}</p>
        <p>${t('emails.supplierSave.body')}</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${invitationUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            ${t('emails.supplierSave.button')}
          </a>
        </p>
        <p><strong>${t('emails.linkValid', { date: formatDate(expiresAt, language) })}</strong></p>
        <p>${t('emails.contactInfo')}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          ${t('emails.autoGenerated')}
        </p>
      </div>
    `,
  })
}

// Confirmation email to supplier after submission
interface ConfirmationEmailOptions {
  to: string
  supplierName: string
  language: Language
  label?: string
}

export async function sendSupplierConfirmationEmail({
  to,
  supplierName,
  language,
  label,
}: ConfirmationEmailOptions) {
  const t = (key: string, vars?: Record<string, string | number>) => getTranslation(language, key, vars)

  await sendEmail({
    to,
    subject: t('emails.supplierConfirmation.subject'),
    language,
    label,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${t('emails.supplierConfirmation.title')}</h2>
        <p>${t('emails.supplierConfirmation.greeting', { supplierName })}</p>
        <p>${t('emails.supplierConfirmation.body')}</p>
        <p>${t('emails.supplierConfirmation.body2')}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          ${t('emails.autoGenerated')}
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
  language: Language
  label?: string
}

export async function sendPurchaserNotificationEmail({
  to,
  purchaserName,
  supplierName,
  requestId,
  language,
  label,
}: PurchaserNotificationEmailOptions) {
  const t = (key: string, vars?: Record<string, string | number>) => getTranslation(language, key, vars)
  const requestUrl = `${APP_URL}/requests/${requestId}/edit`

  await sendEmail({
    to,
    subject: t('emails.purchaserNotification.subject', { supplierName }),
    language,
    label,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${t('emails.purchaserNotification.title')}</h2>
        <p>${t('emails.purchaserNotification.greeting', { purchaserName })}</p>
        <p>${t('emails.purchaserNotification.body', { supplierName })}</p>
        <p>${t('emails.purchaserNotification.cta')}</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${requestUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            ${t('emails.purchaserNotification.button')}
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          ${t('emails.autoGenerated')}
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
  language: Language
  label?: string
}

export async function sendFinanceNotificationEmail({
  to,
  supplierName,
  requestId,
  language,
  label,
}: FinanceNotificationEmailOptions) {
  const t = (key: string, vars?: Record<string, string | number>) => getTranslation(language, key, vars)
  const requestUrl = `${APP_URL}/requests/${requestId}`

  await sendEmail({
    to,
    subject: t('emails.financeNotification.subject', { supplierName }),
    language,
    label,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${t('emails.financeNotification.title')}</h2>
        <p>${t('emails.financeNotification.greeting')}</p>
        <p>${t('emails.financeNotification.body', { supplierName })}</p>
        <p>${t('emails.financeNotification.cta')}</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${requestUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            ${t('emails.financeNotification.button')}
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          ${t('emails.autoGenerated')}
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
  language: Language
  label?: string
}

export async function sendERPNotificationEmail({
  to,
  supplierName,
  requestId,
  language,
  label,
}: ERPNotificationEmailOptions) {
  const t = (key: string, vars?: Record<string, string | number>) => getTranslation(language, key, vars)
  const requestUrl = `${APP_URL}/requests/${requestId}`

  await sendEmail({
    to,
    subject: t('emails.erpNotification.subject', { supplierName }),
    language,
    label,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${t('emails.erpNotification.title')}</h2>
        <p>${t('emails.erpNotification.greeting')}</p>
        <p>${t('emails.erpNotification.body', { supplierName })}</p>
        <p>${t('emails.erpNotification.cta')}</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${requestUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            ${t('emails.erpNotification.button')}
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          ${t('emails.autoGenerated')}
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
  language: Language
  label?: string
}

export async function sendCompletionEmail({
  financeEmails,
  purchaserEmail,
  purchaserName,
  supplierName,
  requestId,
  creditorNumber,
  kbtCode,
  language,
  label,
}: CompletionEmailOptions) {
  const t = (key: string, vars?: Record<string, string | number>) => getTranslation(language, key, vars)
  const requestUrl = `${APP_URL}/requests/${requestId}`

  // Email to Finance users
  for (const financeEmail of financeEmails) {
    await sendEmail({
      to: financeEmail,
      subject: t('emails.completion.subject', { supplierName }),
      language,
      label,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${t('emails.completion.title')}</h2>
        <p>${t('emails.completion.greetingFinance')}</p>
        <p>${t('emails.completion.bodyFinance', { supplierName })}</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>${t('emails.completion.creditorNumber')}</strong> ${creditorNumber}</p>
          <p style="margin: 8px 0 0 0;"><strong>${t('emails.completion.kbtCode')}</strong> ${kbtCode}</p>
        </div>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${requestUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            ${t('emails.completion.button')}
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          ${t('emails.autoGenerated')}
        </p>
      </div>
    `,
    })
  }

  // Email to Purchaser
  if (purchaserEmail) {
    await sendEmail({
      to: purchaserEmail,
      subject: t('emails.completion.subject', { supplierName }),
      language,
      label,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${t('emails.completion.title')}</h2>
          <p>${t('emails.completion.greetingPurchaser', { purchaserName })}</p>
          <p>${t('emails.completion.bodyPurchaser', { supplierName })}</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>${t('emails.completion.creditorNumber')}</strong> ${creditorNumber}</p>
            <p style="margin: 8px 0 0 0;"><strong>${t('emails.completion.kbtCode')}</strong> ${kbtCode}</p>
          </div>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${requestUrl}"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              ${t('emails.completion.button')}
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            ${t('emails.autoGenerated')}
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
  language: Language
}

export async function sendActivationEmail({
  to,
  firstName,
  activationToken,
  expiresAt,
  language,
}: ActivationEmailOptions) {
  const t = (key: string, vars?: Record<string, string | number>) => getTranslation(language, key, vars)
  const activationUrl = `${APP_URL}/activate/${activationToken}`

  await sendEmail({
    to,
    subject: t('emails.activation.subject'),
    language,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${t('emails.activation.title')}</h2>
        <p>${t('emails.activation.greeting', { firstName })}</p>
        <p>${t('emails.activation.body')}</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${activationUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            ${t('emails.activation.button')}
          </a>
        </p>
        <p><strong>${t('emails.linkValid', { date: formatDate(expiresAt, language) })}</strong></p>
        <p>${t('emails.activation.ignoreNotice')}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          ${t('emails.autoGenerated')}
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
  language: Language
}

export async function sendPasswordResetEmail({
  to,
  firstName,
  resetToken,
  expiresAt,
  language,
}: PasswordResetEmailOptions) {
  const t = (key: string, vars?: Record<string, string | number>) => getTranslation(language, key, vars)
  const resetUrl = `${APP_URL}/reset-password/${resetToken}`

  await sendEmail({
    to,
    subject: t('emails.passwordReset.subject'),
    language,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${t('emails.passwordReset.title')}</h2>
        <p>${t('emails.passwordReset.greeting', { firstName })}</p>
        <p>${t('emails.passwordReset.body')}</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            ${t('emails.passwordReset.button')}
          </a>
        </p>
        <p><strong>${t('emails.passwordReset.linkValid', { time: formatTime(expiresAt, language) })}</strong></p>
        <p>${t('emails.passwordReset.ignoreNotice')}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          ${t('emails.autoGenerated')}
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
  language: Language
  label?: string
}

export async function sendReminderEmail({
  to,
  recipientName,
  supplierName,
  requestId,
  role,
  invitationToken,
  language,
  label,
}: ReminderEmailOptions) {
  const t = (key: string, vars?: Record<string, string | number>) => getTranslation(language, key, vars)
  let actionUrl: string
  let actionText: string

  if (role === 'supplier' && invitationToken) {
    actionUrl = `${APP_URL}/supplier/${invitationToken}`
    actionText = t('emails.reminder.buttonSupplier')
  } else {
    actionUrl = `${APP_URL}/requests/${requestId}`
    actionText = t('emails.reminder.buttonInternal')
  }

  await sendEmail({
    to,
    subject: t('emails.reminder.subject', { supplierName }),
    language,
    label,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${t('emails.reminder.title')}</h2>
        <p>${t('emails.reminder.greeting', { recipientName })}</p>
        <p>${t('emails.reminder.body', { supplierName })}</p>
        <p>${t('emails.reminder.cta')}</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${actionUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            ${actionText}
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          ${t('emails.autoGenerated')}
        </p>
      </div>
    `,
  })
}
