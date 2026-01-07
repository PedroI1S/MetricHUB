"use client"

import { useEffect, useRef, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Lock, Unlock } from "lucide-react"

interface MonitoringData {
  time: number
  values: Record<string, number>
}

interface ChannelConfig {
  id: string
  name: string
  type: "volt" | "temp" | "res"
  enabled: boolean
}

interface ChannelValuesTableProps {
  data: MonitoringData[]
  channels: ChannelConfig[]
  isRunning: boolean
  maxRows?: number // Maximum number of rows to display
}

const formatValue = (value: number | undefined, type: "volt" | "temp" | "res") => {
  if (value === undefined || value === null) return "---"
  
  switch (type) {
    case "volt":
      return value.toFixed(3)
    case "temp":
      return value.toFixed(2)
    case "res":
      return value.toFixed(2)
    default:
      return value.toFixed(3)
  }
}

const getUnit = (type: "volt" | "temp" | "res") => {
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

export function ChannelValuesTable({ data, channels, isRunning, maxRows = 100 }: ChannelValuesTableProps) {
  const [isLocked, setIsLocked] = useState(true) // Lock state: true = auto-scroll enabled
  const viewportRef = useRef<HTMLDivElement | null>(null)

  // Callback ref to capture the viewport element
  const setViewportRef = (node: HTMLDivElement | null) => {
    if (node) {
      // Find the actual viewport element within ScrollArea
      const viewport = node.querySelector('[data-slot="scroll-area-viewport"]') as HTMLDivElement
      viewportRef.current = viewport
    }
  }

  // Auto-scroll to bottom when new data arrives and lock is enabled
  useEffect(() => {
    if (viewportRef.current && isLocked && isRunning) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight
    }
  }, [data, isLocked, isRunning])

  // Toggle lock state
  const toggleLock = () => {
    const newLockState = !isLocked
    setIsLocked(newLockState)
    // If locking, immediately scroll to bottom
    if (newLockState && viewportRef.current) {
      setTimeout(() => {
        if (viewportRef.current) {
          viewportRef.current.scrollTop = viewportRef.current.scrollHeight
        }
      }, 100)
    }
  }

  // Display only the last maxRows rows
  const displayData = data.slice(-maxRows)

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="text-sm text-muted-foreground">
          {displayData.length > 0 && (
            <>
              Mostrando {displayData.length} de {data.length} pontos
            </>
          )}
        </div>
        <Button
          variant={isLocked ? "default" : "outline"}
          size="sm"
          onClick={toggleLock}
          title={isLocked ? "Desativar auto-scroll (permitir navegação manual)" : "Ativar auto-scroll (seguir novos dados)"}
        >
          {isLocked ? (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Auto-Scroll ON
            </>
          ) : (
            <>
              <Unlock className="h-4 w-4 mr-2" />
              Auto-Scroll OFF
            </>
          )}
        </Button>
      </div>
      <div ref={setViewportRef}>
        <ScrollArea className="h-[400px]">
          <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[100px] font-semibold">Tempo (s)</TableHead>
              {channels.map((channel) => (
                <TableHead key={channel.id} className="text-center">
                  <div className="flex flex-col">
                    <span className="font-semibold">{channel.name}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      ({channel.id}) {getUnit(channel.type)}
                    </span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={channels.length + 1} className="text-center text-muted-foreground h-32">
                  Aguardando dados...
                </TableCell>
              </TableRow>
            ) : (
              displayData.map((point, index) => (
                <TableRow 
                  key={index}
                  className={index === displayData.length - 1 && isRunning ? "bg-primary/5" : ""}
                >
                  <TableCell className="font-medium">
                    {point.time.toFixed(1)}
                  </TableCell>
                  {channels.map((channel) => (
                    <TableCell key={channel.id} className="text-center font-mono">
                      {formatValue(point.values[channel.id], channel.type)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
      </div>
    </div>
  )
}
