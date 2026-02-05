import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Public paths that don't require auth
    if (path.startsWith('/supplier/') || path === '/login') {
      return NextResponse.next()
    }

    // If no token and trying to access protected route, redirect to login
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname

        // Public paths
        if (path.startsWith('/supplier/') || path === '/login') {
          return true
        }

        // All other paths require authentication
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    // Match all paths except static files, api routes, and public assets
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
