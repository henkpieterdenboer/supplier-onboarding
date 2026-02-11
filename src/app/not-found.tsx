import Link from 'next/link'
import { LOGO_BASE64 } from '@/lib/logo-base64'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <img src={LOGO_BASE64} alt="Logo" className="h-12 w-auto" />
        </div>
        <h1 className="text-7xl font-bold text-gray-200 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Pagina niet gevonden
        </h2>
        <p className="text-gray-500 mb-8">
          De pagina die u zoekt bestaat niet of is verplaatst.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Terug naar dashboard
        </Link>
      </div>
    </div>
  )
}
