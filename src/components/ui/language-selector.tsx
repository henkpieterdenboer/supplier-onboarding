'use client'

import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLanguage } from '@/lib/i18n-context'
import { Language } from '@/lib/i18n'
import { useSession } from 'next-auth/react'

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage()
  const { data: session } = useSession()

  const handleChange = async (lang: Language) => {
    setLanguage(lang)

    // For authenticated users, persist to DB
    if (session?.user) {
      try {
        await fetch('/api/user/language', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: lang }),
        })
      } catch {
        // Non-blocking
      }
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-1.5">
          <Globe className="h-4 w-4" />
          <span className="text-sm font-medium">{language.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleChange('nl')}
          className={`cursor-pointer ${language === 'nl' ? 'bg-blue-50 font-medium' : ''}`}
        >
          Nederlands
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleChange('en')}
          className={`cursor-pointer ${language === 'en' ? 'bg-blue-50 font-medium' : ''}`}
        >
          English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
