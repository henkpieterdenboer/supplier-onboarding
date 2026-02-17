'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Label, Status, SupplierType } from '@/types'
import { formatUserName } from '@/lib/user-utils'
import { statusColors, supplierTypeColors, labelColors } from '@/lib/status-colors'
import * as XLSX from 'xlsx'
import { useLanguage } from '@/lib/i18n-context'
import { getDateLocale } from '@/lib/i18n'
import { Inbox } from 'lucide-react'

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

interface RequestsTableProps {
  requests: Request[]
  userRoles: string[]
  userLabels: string[]
  externalStatusFilter?: string | null
  activeTab?: 'active' | 'archive'
}

export function RequestsTable({ requests, userRoles, userLabels, externalStatusFilter, activeTab }: RequestsTableProps) {
  const { t, language } = useLanguage()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [labelFilter, setLabelFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<'createdAt' | 'supplierName' | 'status' | 'supplierEmail' | 'createdBy'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Synchroniseer externe filter met interne state
  useEffect(() => {
    if (externalStatusFilter !== undefined) {
      setStatusFilter(externalStatusFilter ?? 'all')
    }
  }, [externalStatusFilter])

  const filteredAndSortedRequests = useMemo(() => {
    let result = [...requests]

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(
        (r) =>
          r.supplierName.toLowerCase().includes(searchLower) ||
          r.supplierEmail.toLowerCase().includes(searchLower) ||
          formatUserName(r.createdBy).toLowerCase().includes(searchLower) ||
          r.createdBy.email.toLowerCase().includes(searchLower)
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter)
    }

    // Filter by type
    if (typeFilter !== 'all') {
      result = result.filter((r) => r.supplierType === typeFilter)
    }

    // Filter by label
    if (labelFilter !== 'all') {
      result = result.filter((r) => r.label === labelFilter)
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      if (sortField === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      } else if (sortField === 'supplierName') {
        comparison = a.supplierName.localeCompare(b.supplierName)
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status)
      } else if (sortField === 'supplierEmail') {
        comparison = a.supplierEmail.localeCompare(b.supplierEmail)
      } else if (sortField === 'createdBy') {
        comparison = a.createdBy.lastName.localeCompare(b.createdBy.lastName)
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [requests, search, statusFilter, typeFilter, labelFilter, sortField, sortOrder])

  const handleExport = () => {
    const data = filteredAndSortedRequests.map((r) => ({
      [t('requests.table.supplier')]: r.supplierName,
      'Email': r.supplierEmail,
      [t('requests.table.label')]: t(`enums.label.${r.label}`),
      [t('requests.table.type')]: t(`enums.supplierType.${r.supplierType}`),
      [t('requests.table.status')]: t(`enums.status.${r.status}`),
      [t('requests.table.createdBy')]: formatUserName(r.createdBy) || r.createdBy.email,
      [t('requests.table.date')]: new Date(r.createdAt).toLocaleDateString(getDateLocale(language)),
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, t('requests.table.sheetName'))
    XLSX.writeFile(wb, `leveranciersaanvragen_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const toggleSort = (field: 'createdAt' | 'supplierName' | 'status' | 'supplierEmail' | 'createdBy') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Input
            placeholder={t('requests.table.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
          />
          {userLabels.length > 1 && (
            <Select value={labelFilter} onValueChange={setLabelFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t('requests.table.filterLabel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('requests.table.allLabels')}</SelectItem>
                {Object.values(Label).filter(l => userLabels.includes(l)).map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`enums.label.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t('requests.table.filterStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('requests.table.allStatuses')}</SelectItem>
              {Object.values(Status).map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`enums.status.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder={t('requests.table.filterType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('requests.table.allTypes')}</SelectItem>
              {Object.values(SupplierType).map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`enums.supplierType.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleExport} variant="outline">
          {t('requests.table.export')}
        </Button>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-muted"
                onClick={() => toggleSort('supplierName')}
              >
                {t('requests.table.supplier')}
                {sortField === 'supplierName' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead>{t('requests.table.label')}</TableHead>
              <TableHead>{t('requests.table.type')}</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted"
                onClick={() => toggleSort('supplierEmail')}
              >
                {t('requests.table.email')}
                {sortField === 'supplierEmail' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted"
                onClick={() => toggleSort('status')}
              >
                {t('requests.table.status')}
                {sortField === 'status' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted"
                onClick={() => toggleSort('createdBy')}
              >
                {t('requests.table.createdBy')}
                {sortField === 'createdBy' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted"
                onClick={() => toggleSort('createdAt')}
              >
                {t('requests.table.date')}
                {sortField === 'createdAt' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead>{t('requests.table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Inbox className="h-8 w-8" />
                    <p className="text-sm font-medium">{t('requests.table.empty')}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    <Link href={`/requests/${request.id}`} className="hover:text-primary hover:underline">
                      {request.supplierName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge className={labelColors[request.label] || 'bg-muted text-muted-foreground'}>
                      {t(`enums.label.${request.label}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={supplierTypeColors[request.supplierType] || 'bg-muted text-muted-foreground'}>
                      {t(`enums.supplierType.${request.supplierType}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>{request.supplierEmail}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[request.status]}>
                      {t(`enums.status.${request.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatUserName(request.createdBy) || request.createdBy.email}</TableCell>
                  <TableCell>
                    {new Date(request.createdAt).toLocaleDateString(getDateLocale(language))}
                  </TableCell>
                  <TableCell>
                    <Link href={`/requests/${request.id}`}>
                      <Button variant="ghost" size="sm">
                        {t('requests.table.view')}
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        {t('requests.table.count', { filtered: filteredAndSortedRequests.length, total: requests.length })}
      </div>
    </div>
  )
}
