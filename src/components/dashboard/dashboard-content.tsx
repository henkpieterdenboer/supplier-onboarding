'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { DashboardStats } from '@/components/dashboard/stats'
import { RequestsTable } from '@/components/dashboard/requests-table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLanguage } from '@/lib/i18n-context'

interface Request {
  id: string
  supplierName: string
  supplierEmail: string
  relationType: string
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
  userRelationTypes: string[]
}

const ACTIVE_STATUSES = ['INVITATION_SENT', 'AWAITING_PURCHASER', 'AWAITING_ERP', 'AWAITING_FINANCE']
const ARCHIVE_STATUSES = ['COMPLETED', 'CANCELLED']

export function DashboardContent({ stats, requests, userRoles, userLabels, userRelationTypes }: DashboardContentProps) {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'archive' ? 'archive' : 'active'
  const initialRelationType = searchParams.get('relationType') || 'all'
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>(initialTab)
  const [relationTypeFilter, setRelationTypeFilter] = useState<string>(initialRelationType)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [emailProvider, setEmailProvider] = useState<string>('ethereal')
  const { t } = useLanguage()
  const showRelationTypeFilter = userRelationTypes.length > 1

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      fetch('/api/email-provider')
        .then((res) => res.json())
        .then((data) => { if (data.provider) setEmailProvider(data.provider) })
        .catch(() => {})
    }
  }, [])

  const filteredRequests = useMemo(() => {
    const statuses = activeTab === 'active' ? ACTIVE_STATUSES : ARCHIVE_STATUSES
    return requests
      .filter(r => statuses.includes(r.status))
      .filter(r => relationTypeFilter === 'all' || r.relationType === relationTypeFilter)
  }, [requests, activeTab, relationTypeFilter])

  // Recalculate stats based on relationType filter
  const filteredStats = useMemo(() => {
    if (relationTypeFilter === 'all') return stats
    const filtered = requests.filter(r => r.relationType === relationTypeFilter)
    return {
      total: filtered.length,
      waitingSupplier: filtered.filter(r => r.status === 'INVITATION_SENT').length,
      waitingPurchaser: filtered.filter(r => r.status === 'AWAITING_PURCHASER').length,
      waitingFinance: filtered.filter(r => r.status === 'AWAITING_FINANCE').length,
      waitingERP: filtered.filter(r => r.status === 'AWAITING_ERP').length,
      completed: filtered.filter(r => r.status === 'COMPLETED').length,
      cancelled: filtered.filter(r => r.status === 'CANCELLED').length,
    }
  }, [stats, requests, relationTypeFilter])

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

      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="active">{t('dashboard.tabs.active')}</TabsTrigger>
            <TabsTrigger value="archive">{t('dashboard.tabs.archive')}</TabsTrigger>
          </TabsList>
        </Tabs>

        {showRelationTypeFilter && (
          <Tabs value={relationTypeFilter} onValueChange={(v) => { setRelationTypeFilter(v); setSelectedStatus(null) }}>
            <TabsList>
              <TabsTrigger value="all">{t('common.all')}</TabsTrigger>
              <TabsTrigger value="SUPPLIER">{t('enums.relationType.SUPPLIER')}</TabsTrigger>
              <TabsTrigger value="CUSTOMER">{t('enums.relationType.CUSTOMER')}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      <DashboardStats
        stats={filteredStats}
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

      {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && emailProvider === 'ethereal' && (
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
