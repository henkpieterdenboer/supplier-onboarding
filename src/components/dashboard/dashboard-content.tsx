'use client'

import { useState } from 'react'
import { DashboardStats } from '@/components/dashboard/stats'
import { RequestsTable } from '@/components/dashboard/requests-table'
import { useLanguage } from '@/lib/i18n-context'

interface Request {
  id: string
  supplierName: string
  supplierEmail: string
  status: string
  region: string
  supplierType: string
  label: string
  createdAt: Date
  createdBy: {
    firstName: string
    middleName: string | null
    lastName: string
    email: string
  }
}

interface Stats {
  total: number
  waitingSupplier: number
  waitingPurchaser: number
  waitingFinance: number
  waitingERP: number
  completed: number
  cancelled: number
}

interface DashboardContentProps {
  stats: Stats
  requests: Request[]
  userRoles: string[]
  userLabels: string[]
}

export function DashboardContent({ stats, requests, userRoles, userLabels }: DashboardContentProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const { t } = useLanguage()

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-gray-500">{t('dashboard.description')}</p>
      </div>

      <DashboardStats
        stats={stats}
        selectedStatus={selectedStatus}
        onStatusClick={setSelectedStatus}
      />

      <RequestsTable
        requests={requests}
        userRoles={userRoles}
        userLabels={userLabels}
        externalStatusFilter={selectedStatus}
      />

      {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600 font-medium mb-2">{t('demo.viewEmails')}</p>
          <p className="text-sm text-gray-500 mb-1">
            <a href="https://ethereal.email/login" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              https://ethereal.email/login
            </a>
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>{t('demo.emailCreds')}</li>
            <li>{t('demo.passwordCreds')}</li>
          </ul>
        </div>
      )}
    </>
  )
}
