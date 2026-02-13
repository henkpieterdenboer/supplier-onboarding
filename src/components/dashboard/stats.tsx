'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/lib/i18n-context'

interface StatsProps {
  stats: {
    total: number
    waitingSupplier: number
    waitingPurchaser: number
    waitingFinance: number
    waitingERP: number
    completed: number
    cancelled: number
  }
  selectedStatus?: string | null
  onStatusClick?: (status: string | null) => void
}

export function DashboardStats({ stats, selectedStatus, onStatusClick }: StatsProps) {
  const { t } = useLanguage()

  const statItems = [
    { label: t('dashboard.stats.total'), value: stats.total, color: 'text-gray-900', status: null },
    { label: t('dashboard.stats.waitingSupplier'), value: stats.waitingSupplier, color: 'text-yellow-600', status: 'INVITATION_SENT' },
    { label: t('dashboard.stats.waitingPurchaser'), value: stats.waitingPurchaser, color: 'text-orange-600', status: 'AWAITING_PURCHASER' },
    { label: t('dashboard.stats.waitingFinance'), value: stats.waitingFinance, color: 'text-blue-600', status: 'AWAITING_FINANCE' },
    { label: t('dashboard.stats.waitingERP'), value: stats.waitingERP, color: 'text-purple-600', status: 'AWAITING_ERP' },
    { label: t('dashboard.stats.completed'), value: stats.completed, color: 'text-green-600', status: 'COMPLETED' },
    { label: t('dashboard.stats.cancelled'), value: stats.cancelled, color: 'text-red-600', status: 'CANCELLED' },
  ]

  const handleClick = (status: string | null) => {
    if (!onStatusClick) return
    // Toggle: als dezelfde status wordt aangeklikt, reset naar null (alle)
    if (selectedStatus === status) {
      onStatusClick(null)
    } else {
      onStatusClick(status)
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
      {statItems.map((item) => {
        const isSelected = selectedStatus === item.status
        const isClickable = !!onStatusClick

        return (
          <Card
            key={item.label}
            className={`
              ${isClickable ? 'cursor-pointer transition-all hover:shadow-md' : ''}
              ${isSelected ? 'ring-2 ring-blue-500 shadow-md' : ''}
            `}
            onClick={() => handleClick(item.status)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
