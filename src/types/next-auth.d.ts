import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    email: string
    name: string
    roles: string[]
    labels: string[]
    relationTypes: string[]
    language: string
  }

  interface Session {
    user: User & {
      id: string
      roles: string[]
      labels: string[]
      relationTypes: string[]
      language: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    roles: string[]
    labels: string[]
    relationTypes: string[]
    language: string
  }
}
