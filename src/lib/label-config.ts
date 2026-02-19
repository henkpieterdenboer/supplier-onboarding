import { Label } from '@/types'

interface LabelConfig {
  name: string
  shortName: string
  logoPath: string
  emailLogoHeight: number // px height for logo in emails
}

export const labelConfigs: Record<Label, LabelConfig> = {
  COLORIGINZ: {
    name: 'Coloriginz',
    shortName: 'COL',
    logoPath: '/logo.png',
    emailLogoHeight: 60,
  },
  PFC: {
    name: 'Parfum Flower Company',
    shortName: 'PFC',
    logoPath: '/PFC.jpg',
    emailLogoHeight: 120,
  },
}

export function getLabelConfig(label: string): LabelConfig {
  return labelConfigs[label as Label] ?? labelConfigs.COLORIGINZ
}

export function getLabelLogoUrl(label: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || ''
  return `${appUrl}${getLabelConfig(label).logoPath}`
}
