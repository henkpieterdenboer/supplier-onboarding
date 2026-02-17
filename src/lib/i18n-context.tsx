'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { getTranslation, Language } from './i18n'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (path: string, variables?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : undefined
}

function setCookie(name: string, value: string, days: number = 365) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`
}

interface LanguageProviderProps {
  children: ReactNode
  initialLanguage?: Language
}

export function LanguageProvider({ children, initialLanguage }: LanguageProviderProps) {
  const { data: session } = useSession()

  const [language, setLanguageState] = useState<Language>(() => {
    if (initialLanguage) return initialLanguage
    if (typeof document !== 'undefined') {
      const cookie = getCookie('NEXT_LOCALE')
      if (cookie === 'en' || cookie === 'nl' || cookie === 'es') return cookie
    }
    return 'nl'
  })

  // Sync language between cookie and session
  useEffect(() => {
    if (!initialLanguage && session?.user?.language) {
      const sessionLang = session.user.language as Language
      const cookieLang = getCookie('NEXT_LOCALE')
      const hasExplicitCookie = cookieLang === 'nl' || cookieLang === 'en' || cookieLang === 'es'

      if (hasExplicitCookie && cookieLang !== sessionLang) {
        // Cookie differs from session — user explicitly chose a language
        // (e.g. on login page). Persist cookie value to DB.
        fetch('/api/user/language', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: cookieLang }),
        }).catch(() => {})
      } else if (!hasExplicitCookie && sessionLang !== language) {
        // No explicit cookie — sync from session (first visit)
        setLanguageState(sessionLang)
        setCookie('NEXT_LOCALE', sessionLang)
      }
    }
  }, [session?.user?.language]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update HTML lang attribute
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    setCookie('NEXT_LOCALE', lang)
  }, [])

  const t = useCallback(
    (path: string, variables?: Record<string, string | number>) =>
      getTranslation(language, path, variables),
    [language]
  )

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
