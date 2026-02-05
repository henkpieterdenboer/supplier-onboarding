'use client'

import { useState } from 'react'
import { DashboardStats } from '@/components/dashboard/stats'
import { RequestsTable } from '@/components/dashboard/requests-table'

interface Request {
  id: string
  supplierName: string
  supplierEmail: string
  status: string
  region: string
  createdAt: Date
  createdBy: {
    name: string | null
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
  userRole: string
}

export function DashboardContent({ stats, requests, userRole }: DashboardContentProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)

  return (
    <>
      <DashboardStats
        stats={stats}
        selectedStatus={selectedStatus}
        onStatusClick={setSelectedStatus}
      />

      <RequestsTable
        requests={requests}
        userRole={userRole}
        externalStatusFilter={selectedStatus}
      />
    </>
  )
}
