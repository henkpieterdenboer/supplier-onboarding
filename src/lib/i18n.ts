import nl from '@/translations/nl.json'
import en from '@/translations/en.json'
import es from '@/translations/es.json'

export type Language = 'nl' | 'en' | 'es'

const translations: Record<Language, Record<string, unknown>> = { nl, en, es }

/**
 * Get a translation by dot-notation path.
 * Supports variable interpolation: {name} -> "John"
 * Falls back to the key itself if not found.
 */
export function getTranslation(
  language: Language,
  path: string,
  variables?: Record<string, string | number>
): string {
  const keys = path.split('.')
  let result: unknown = translations[language]

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key]
    } else {
      // Fallback: try NL, then return the key
      let fallback: unknown = translations['nl']
      for (const k of keys) {
        if (fallback && typeof fallback === 'object' && k in fallback) {
          fallback = (fallback as Record<string, unknown>)[k]
        } else {
          return path
        }
      }
      result = fallback
      break
    }
  }

  if (typeof result !== 'string') {
    return path
  }

  if (variables) {
    return result.replace(/\{(\w+)\}/g, (_, key) =>
      variables[key] !== undefined ? String(variables[key]) : `{${key}}`
    )
  }

  return result
}

/**
 * Get the date locale string for a language
 */
export function getDateLocale(language: Language): string {
  switch (language) {
    case 'nl': return 'nl-NL'
    case 'es': return 'es-ES'
    default: return 'en-GB'
  }
}

/**
 * Format a date for display
 */
export function formatDate(date: Date, language: Language): string {
  return date.toLocaleDateString(getDateLocale(language))
}

/**
 * Format a time for display
 */
export function formatTime(date: Date, language: Language): string {
  return date.toLocaleTimeString(getDateLocale(language), {
    hour: '2-digit',
    minute: '2-digit',
  })
}
