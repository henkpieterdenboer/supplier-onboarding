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
  activeTab: 'active' | 'archive'
  selectedStatus?: string | null
  onStatusClick?: (status: string | null) => void
}

export function DashboardStats({ stats, activeTab, selectedStatus, onStatusClick }: StatsProps) {
  const { t } = useLanguage()

  const totalActive = stats.waitingSupplier + stats.waitingPurchaser + stats.waitingFinance + stats.waitingERP

  const activeItems = [
    { label: t('dashboard.stats.totalActive'), value: totalActive, color: 'text-foreground', status: null },
    { label: t('dashboard.stats.waitingSupplier'), value: stats.waitingSupplier, color: 'text-yellow-600', status: 'INVITATION_SENT' },
    { label: t('dashboard.stats.waitingPurchaser'), value: stats.waitingPurchaser, color: 'text-orange-600', status: 'AWAITING_PURCHASER' },
    { label: t('dashboard.stats.waitingFinance'), value: stats.waitingFinance, color: 'text-blue-600', status: 'AWAITING_FINANCE' },
    { label: t('dashboard.stats.waitingERP'), value: stats.waitingERP, color: 'text-purple-600', status: 'AWAITING_ERP' },
  ]

  const archiveItems = [
    { label: t('dashboard.stats.completed'), value: stats.completed, color: 'text-green-600', status: 'COMPLETED' },
    { label: t('dashboard.stats.cancelled'), value: stats.cancelled, color: 'text-red-600', status: 'CANCELLED' },
  ]

  const statItems = activeTab === 'active' ? activeItems : archiveItems

  const handleClick = (status: string | null) => {
    if (!onStatusClick) return
    if (selectedStatus === status) {
      onStatusClick(null)
    } else {
      onStatusClick(status)
    }
  }

  const gridCols = activeTab === 'active'
    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
    : 'grid-cols-2 max-w-lg'

  return (
    <div className={`grid gap-4 ${gridCols}`}>
      {statItems.map((item) => {
        const isSelected = selectedStatus === item.status
        const isClickable = !!onStatusClick

        return (
          <Card
            key={item.label}
            className={`
              ${isClickable ? 'cursor-pointer transition-all hover:shadow-md' : ''}
              ${isSelected ? 'ring-2 ring-primary shadow-md' : ''}
            `}
            onClick={() => handleClick(item.status)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
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
