'use client'

import { LOGO_BASE64 } from '@/lib/logo-base64'
import { useLanguage } from '@/lib/i18n-context'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <img src={LOGO_BASE64} alt="Logo" className="h-12 w-auto" />
        </div>
        <h1 className="text-7xl font-bold text-gray-200 mb-2">500</h1>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          {t('errors.error.title')}
        </h2>
        <p className="text-gray-500 mb-8">
          {t('errors.error.message')}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            {t('errors.error.retry')}
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('errors.error.backToDashboard')}
          </a>
        </div>
      </div>
    </div>
  )
}
