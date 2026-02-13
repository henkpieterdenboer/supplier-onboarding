import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import AzureADProvider from 'next-auth/providers/azure-ad'
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
          throw new Error('Email and password are required')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          throw new Error('User not found')
        }

        if (!user.passwordHash) {
          throw new Error('Account not yet activated. Use the activation link from your email.')
        }

        if (!user.isActive) {
          throw new Error('Account is deactivated')
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)

        if (!isValid) {
          throw new Error('Invalid password')
        }

        // Reset demo user roles to their default on login (only in demo mode)
        let effectiveRoles = user.roles
        if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
          const defaultRolesMap: Record<string, string[]> = {
            'inkoper@demo.nl': ['INKOPER'],
            'finance@demo.nl': ['FINANCE'],
            'erp@demo.nl': ['ERP'],
            'admin@demo.nl': ['ADMIN'],
          }

          const defaultRoles = defaultRolesMap[credentials.email]
          if (defaultRoles) {
            effectiveRoles = defaultRoles
          }

          // Update roles in database if they were changed
          if (JSON.stringify(effectiveRoles) !== JSON.stringify(user.roles)) {
            await prisma.user.update({
              where: { id: user.id },
              data: { roles: effectiveRoles },
            })
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: formatUserName(user),
          roles: effectiveRoles,
          language: user.preferredLanguage || 'nl',
        }
      },
    }),
    ...(process.env.AZURE_AD_CLIENT_ID
      ? [AzureADProvider({
          clientId: process.env.AZURE_AD_CLIENT_ID!,
          clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
          tenantId: process.env.AZURE_AD_TENANT_ID!,
          authorization: { params: { prompt: 'select_account' } },
        })]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'credentials') {
        return true
      }

      if (account?.provider === 'azure-ad') {
        const email = user.email
        if (!email) {
          return '/login?error=NoEmail'
        }

        const dbUser = await prisma.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
        })

        if (!dbUser) {
          return '/login?error=AccountNotFound'
        }

        // Auto-activate on first SSO login
        if (!dbUser.isActive) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              isActive: true,
              activationToken: null,
              activationExpiresAt: null,
            },
          })
        }

        return true
      }

      return true
    },
    async jwt({ token, user, account }) {
      if (user && account?.provider === 'credentials') {
        token.id = user.id
        token.roles = user.roles
        token.language = user.language || 'nl'
      }

      if (account?.provider === 'azure-ad') {
        const dbUser = await prisma.user.findFirst({
          where: { email: { equals: user.email!, mode: 'insensitive' } },
          select: { id: true, roles: true, preferredLanguage: true },
        })
        if (dbUser) {
          token.id = dbUser.id
          token.roles = dbUser.roles
          token.language = dbUser.preferredLanguage || 'nl'
        }
      }
      // Always fetch the latest roles and isActive from database
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { roles: true, isActive: true, firstName: true, middleName: true, lastName: true, preferredLanguage: true },
          })
          if (dbUser) {
            if (!dbUser.isActive) {
              // User was deactivated - invalidate session
              return {} as typeof token
            }
            token.roles = dbUser.roles
            token.name = formatUserName(dbUser)
            token.language = dbUser.preferredLanguage || 'nl'
          }
        } catch {
          // Database not available during build, use cached roles
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.roles = token.roles as string[]
        session.user.language = (token.language as string) || 'nl'
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
