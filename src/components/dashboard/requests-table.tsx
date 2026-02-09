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
import { Status, StatusLabels } from '@/types'
import { formatUserName } from '@/lib/user-utils'
import * as XLSX from 'xlsx'

interface Request {
  id: string
  supplierName: string
  supplierEmail: string
  status: string
  region: string
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
  userRole: string
  externalStatusFilter?: string | null
}

const statusColors: Record<string, string> = {
  INVITATION_SENT: 'bg-yellow-100 text-yellow-800',
  AWAITING_PURCHASER: 'bg-orange-100 text-orange-800',
  AWAITING_FINANCE: 'bg-blue-100 text-blue-800',
  AWAITING_ERP: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

export function RequestsTable({ requests, userRole, externalStatusFilter }: RequestsTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<'createdAt' | 'supplierName' | 'status' | 'supplierEmail'>('createdAt')
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
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [requests, search, statusFilter, sortField, sortOrder])

  const handleExport = () => {
    const data = filteredAndSortedRequests.map((r) => ({
      'Leverancier': r.supplierName,
      'Email': r.supplierEmail,
      'Status': StatusLabels[r.status as Status] || r.status,
      'Aangemaakt door': formatUserName(r.createdBy) || r.createdBy.email,
      'Datum': new Date(r.createdAt).toLocaleDateString('nl-NL'),
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Aanvragen')
    XLSX.writeFile(wb, `leveranciersaanvragen_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const toggleSort = (field: 'createdAt' | 'supplierName' | 'status' | 'supplierEmail') => {
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
            placeholder="Zoeken op naam of email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter op status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statussen</SelectItem>
              {Object.entries(StatusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleExport} variant="outline">
          Export naar Excel
        </Button>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSort('supplierName')}
              >
                Leverancier
                {sortField === 'supplierName' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSort('supplierEmail')}
              >
                Email
                {sortField === 'supplierEmail' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSort('status')}
              >
                Status
                {sortField === 'status' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead>Aangemaakt door</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSort('createdAt')}
              >
                Datum
                {sortField === 'createdAt' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead>Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Geen aanvragen gevonden
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    <Link href={`/requests/${request.id}`} className="hover:text-blue-600 hover:underline">
                      {request.supplierName}
                    </Link>
                  </TableCell>
                  <TableCell>{request.supplierEmail}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[request.status]}>
                      {StatusLabels[request.status as Status] || request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatUserName(request.createdBy) || request.createdBy.email}</TableCell>
                  <TableCell>
                    {new Date(request.createdAt).toLocaleDateString('nl-NL')}
                  </TableCell>
                  <TableCell>
                    <Link href={`/requests/${request.id}`}>
                      <Button variant="ghost" size="sm">
                        Bekijken
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-gray-500">
        {filteredAndSortedRequests.length} van {requests.length} aanvragen
      </div>
    </div>
  )
}
