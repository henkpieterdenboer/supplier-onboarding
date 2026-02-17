'use client'

import { getTranslation, Language } from '@/lib/i18n'

function getLanguageFromCookie(): Language {
  if (typeof document === 'undefined') return 'nl'
  const match = document.cookie.match(/(^| )NEXT_LOCALE=([^;]+)/)
  const lang = match ? match[2] : 'nl'
  return lang === 'en' ? 'en' : lang === 'es' ? 'es' : 'nl'
}

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const lang = getLanguageFromCookie()
  const t = (key: string) => getTranslation(lang, key)

  return (
    <html lang={lang}>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
          padding: '1rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
            <h1 style={{ fontSize: '4rem', fontWeight: 'bold', color: '#e5e7eb', marginBottom: '0.5rem' }}>
              500
            </h1>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.5rem' }}>
              {t('errors.globalError.title')}
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
              {t('errors.globalError.message')}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={reset}
                style={{
                  padding: '0.625rem 1.5rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {t('errors.globalError.retry')}
              </button>
              <a
                href="/"
                style={{
                  padding: '0.625rem 1.5rem',
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                {t('errors.globalError.backToHome')}
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
