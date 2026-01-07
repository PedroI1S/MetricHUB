"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"

interface ReportData {
  time: number
  values: Record<string, number>
}

interface ChannelConfig {
  id: string
  name: string
  type: "volt" | "temp" | "res"
  enabled: boolean
}

interface DataTableProps {
  data: ReportData[]
  channels: ChannelConfig[]
}

const ITEMS_PER_PAGE = 50

export function DataTable({ data, channels }: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")

  const getUnit = (type: string) => {
    switch (type) {
      case "volt":
        return "V"
      case "temp":
        return "°C"
      case "res":
        return "Ω"
      default:
        return ""
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Filter data based on search term
  const filteredData = data.filter((point) => {
    if (!searchTerm) return true
    const timeString = formatTime(point.time)
    return (
      timeString.includes(searchTerm) ||
      channels.some((channel) => point.values[channel.id]?.toString().includes(searchTerm))
    )
  })

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentData = filteredData.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  return (
    <div className="space-y-4">
      {/* Search and pagination controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tempo ou valor..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1) // Reset to first page when searching
            }}
            className="w-64"
          />
        </div>

        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <span>
            Mostrando {startIndex + 1}-{Math.min(endIndex, filteredData.length)} de {filteredData.length} registros
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[500px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/50">
              <TableRow>
                <TableHead className="w-24">Tempo</TableHead>
                {channels.map((channel) => (
                  <TableHead key={channel.id} className="text-center">
                    {channel.name}
                    <br />
                    <span className="text-xs text-muted-foreground">({getUnit(channel.type)})</span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.map((point, index) => (
                <TableRow key={startIndex + index} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-sm">{formatTime(point.time)}</TableCell>
                  {channels.map((channel) => (
                    <TableCell key={channel.id} className="text-center font-mono text-sm">
                      {point.values[channel.id]?.toFixed(4) || "N/A"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
