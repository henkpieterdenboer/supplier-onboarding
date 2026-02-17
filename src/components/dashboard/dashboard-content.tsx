'use client'

import { useState, useMemo } from 'react'
import { DashboardStats } from '@/components/dashboard/stats'
import { RequestsTable } from '@/components/dashboard/requests-table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

const ACTIVE_STATUSES = ['INVITATION_SENT', 'AWAITING_PURCHASER', 'AWAITING_FINANCE', 'AWAITING_ERP']
const ARCHIVE_STATUSES = ['COMPLETED', 'CANCELLED']

export function DashboardContent({ stats, requests, userRoles, userLabels }: DashboardContentProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active')
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const { t } = useLanguage()

  const filteredRequests = useMemo(() => {
    const statuses = activeTab === 'active' ? ACTIVE_STATUSES : ARCHIVE_STATUSES
    return requests.filter(r => statuses.includes(r.status))
  }, [requests, activeTab])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'active' | 'archive')
    setSelectedStatus(null)
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-gray-500">{t('dashboard.description')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="active">{t('dashboard.tabs.active')}</TabsTrigger>
          <TabsTrigger value="archive">{t('dashboard.tabs.archive')}</TabsTrigger>
        </TabsList>
      </Tabs>

      <DashboardStats
        stats={stats}
        activeTab={activeTab}
        selectedStatus={selectedStatus}
        onStatusClick={setSelectedStatus}
      />

      <RequestsTable
        requests={filteredRequests}
        userRoles={userRoles}
        userLabels={userLabels}
        externalStatusFilter={selectedStatus}
        activeTab={activeTab}
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
