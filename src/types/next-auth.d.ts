import 'next-auth'
import { Role } from './index'

declare module 'next-auth' {
  interface User {
    id: string
    email: string
    name: string
    roles: string[]
    language: string
  }

  interface Session {
    user: User & {
      id: string
      roles: string[]
      language: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    roles: string[]
    language: string
  }
}
