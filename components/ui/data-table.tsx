"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Search, 
  SortAsc, 
  SortDesc 
} from "lucide-react"
import { Loading } from "@/components/ui/loading"
import { PAGINATION } from "@/lib/constants"

interface DataTableColumn<T> {
  key: string
  title: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  searchable?: boolean
}

interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  loading?: boolean
  pagination?: boolean
  pageSize?: number
  searchable?: boolean
  searchPlaceholder?: string
  emptyState?: React.ReactNode
  onRowClick?: (row: T) => void
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  pagination = true,
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
  searchable = true,
  searchPlaceholder = "بحث...",
  emptyState,
  onRowClick
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "ascending" | "descending" } | null>(null)

  // Handle sorting
  const handleSort = (key: string) => {
    if (sortConfig && sortConfig.key === key) {
      if (sortConfig.direction === "ascending") {
        setSortConfig({ key, direction: "descending" })
      } else {
        setSortConfig(null)
      }
    } else {
      setSortConfig({ key, direction: "ascending" })
    }
  }

  // Filter data based on search query
  const filteredData = searchQuery.trim() === "" 
    ? data
    : data.filter(row => {
        return columns.some(column => {
          if (!column.searchable) return false
          
          const value = row[column.key]
          if (value == null) return false
          
          return String(value).toLowerCase().includes(searchQuery.toLowerCase())
        })
      })

  // Sort data
  const sortedData = sortConfig
    ? [...filteredData].sort((a, b) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]
        
        if (aValue == null) return sortConfig.direction === "ascending" ? -1 : 1
        if (bValue == null) return sortConfig.direction === "ascending" ? 1 : -1
        
        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortConfig.direction === "ascending"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue)
        }
        
        return sortConfig.direction === "ascending"
          ? aValue - bValue
          : bValue - aValue
      })
    : filteredData

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / pageSize)
  const paginatedData = pagination
    ? sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sortedData

  // Navigate to page
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  // Reset to first page when search changes
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
  }

  if (loading) {
    return <Loading text="جاري تحميل البيانات..." />
  }

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pr-10"
          />
        </div>
      )}
      
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className="whitespace-nowrap">
                  <div className="flex items-center">
                    <span>{column.title}</span>
                    {column.sortable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-1 h-6 w-6 p-0"
                        onClick={() => handleSort(column.key)}
                      >
                        {sortConfig?.key === column.key ? (
                          sortConfig.direction === "ascending" ? (
                            <SortAsc className="h-4 w-4" />
                          ) : (
                            <SortDesc className="h-4 w-4" />
                          )
                        ) : (
                          <SortAsc className="h-4 w-4 text-muted-foreground opacity-50" />
                        )}
                      </Button>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  {emptyState || "لا توجد بيانات لعرضها"}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => (
                <TableRow 
                  key={index}
                  className={onRowClick ? "cursor-pointer hover:bg-muted" : undefined}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      {column.render ? column.render(row) : (row[column.key] || "-")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {`صفحة ${currentPage} من ${totalPages} (${filteredData.length} سجل)`}
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 