import { Label } from '@/types'

interface LabelConfig {
  name: string
  shortName: string
  logoPath: string
  emailLogoHeight: number // px height for logo in emails
  emailLogoWidth: number  // px width for logo in emails (needed for old Outlook)
}

export const labelConfigs: Record<Label, LabelConfig> = {
  COLORIGINZ: {
    name: 'Coloriginz',
    shortName: 'COL',
    logoPath: '/logo.png',
    emailLogoHeight: 60,
    emailLogoWidth: 240,  // 1280x319 source, aspect ratio ~4:1
  },
  PFC: {
    name: 'Parfum Flower Company',
    shortName: 'PFC',
    logoPath: '/PFC.jpg',
    emailLogoHeight: 120,
    emailLogoWidth: 174,  // 729x504 source, aspect ratio ~1.45:1
  },
  FFS: {
    name: 'Fresh From Source',
    shortName: 'FFS',
    logoPath: '/ffs.png',
    emailLogoHeight: 60,
    emailLogoWidth: 63,  // 480x460 source, aspect ratio ~1.04:1
  },
}

export function getLabelConfig(label: string): LabelConfig {
  return labelConfigs[label as Label] ?? labelConfigs.COLORIGINZ
}

export function getLabelAppUrl(label: string): string {
  const fallback = process.env.APP_URL || 'http://localhost:3000'
  if (label === 'PFC') {
    return process.env.APP_URL_PFC || fallback
  }
  if (label === 'FFS') {
    return process.env.APP_URL_FFS || fallback
  }
  return fallback
}

export function getLabelEmailFrom(label: string): string {
  const fallback = process.env.EMAIL_FROM || '"Supplier Onboarding" <noreply@supplier-onboarding.local>'
  if (label === 'PFC') {
    return process.env.EMAIL_FROM_PFC || fallback
  }
  if (label === 'FFS') {
    return process.env.EMAIL_FROM_FFS || fallback
  }
  return fallback
}

export function getLabelLogoUrl(label: string): string {
  return `${getLabelAppUrl(label)}${getLabelConfig(label).logoPath}`
}
