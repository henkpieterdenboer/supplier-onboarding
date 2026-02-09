import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './db'
import { formatUserName } from './user-utils'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email en wachtwoord zijn verplicht')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          throw new Error('Gebruiker niet gevonden')
        }

        if (!user.passwordHash) {
          throw new Error('Account nog niet geactiveerd. Gebruik de activatielink uit uw email.')
        }

        if (!user.isActive) {
          throw new Error('Account is gedeactiveerd')
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)

        if (!isValid) {
          throw new Error('Ongeldig wachtwoord')
        }

        // Reset demo user roles to their default on login
        let defaultRole = user.role
        if (credentials.email === 'inkoper@demo.nl') {
          defaultRole = 'INKOPER'
        } else if (credentials.email === 'finance@demo.nl') {
          defaultRole = 'FINANCE'
        } else if (credentials.email === 'erp@demo.nl') {
          defaultRole = 'ERP'
        } else if (credentials.email === 'admin@demo.nl') {
          defaultRole = 'ADMIN'
        }

        // Update role in database if it was changed
        if (defaultRole !== user.role) {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: defaultRole },
          })
        }

        return {
          id: user.id,
          email: user.email,
          name: formatUserName(user),
          role: defaultRole,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      // Always fetch the latest role and isActive from database
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, isActive: true, firstName: true, middleName: true, lastName: true },
          })
          if (dbUser) {
            if (!dbUser.isActive) {
              // User was deactivated - invalidate session
              return {} as typeof token
            }
            token.role = dbUser.role
            token.name = formatUserName(dbUser)
          }
        } catch {
          // Database not available during build, use cached role
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
