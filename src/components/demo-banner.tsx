'use client'

import { useLanguage } from '@/lib/i18n-context'

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export function DemoBanner() {
  const { t } = useLanguage()

  if (!isDemoMode) return null

  return (
    <div className="bg-red-50 border-b border-red-200 text-red-700 text-center text-sm font-medium py-1">
      {t('demo.banner')}
    </div>
  )
}
