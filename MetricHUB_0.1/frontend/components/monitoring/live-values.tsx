"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Zap, Thermometer, Gauge, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChannelConfig {
  id: string
  name: string
  type: "volt" | "temp" | "res"
  enabled: boolean
}

interface LiveValuesProps {
  channels: ChannelConfig[]
  values: Record<string, number>
  isRunning: boolean
}

interface ValueHistory {
  current: number
  previous: number
  trend: "up" | "down" | "stable"
}

export function LiveValues({ channels, values, isRunning }: LiveValuesProps) {
  const [valueHistory, setValueHistory] = useState<Record<string, ValueHistory>>({})

  useEffect(() => {
    setValueHistory((prev) => {
      const newHistory: Record<string, ValueHistory> = {}

      channels.forEach((channel) => {
        const currentValue = values[channel.id] || 0
        const previousValue = prev[channel.id]?.current || currentValue

        let trend: "up" | "down" | "stable" = "stable"
        const diff = currentValue - previousValue
        if (Math.abs(diff) > 0.01) {
          // Threshold for trend detection
          trend = diff > 0 ? "up" : "down"
        }

        newHistory[channel.id] = {
          current: currentValue,
          previous: previousValue,
          trend,
        }
      })

      return newHistory
    })
  }, [values, channels])

  const getChannelIcon = (type: string) => {
    switch (type) {
      case "volt":
        return <Zap className="h-4 w-4" />
      case "temp":
        return <Thermometer className="h-4 w-4" />
      case "res":
        return <Gauge className="h-4 w-4" />
      default:
        return null
    }
  }

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

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3 w-3 text-accent" />
      case "down":
        return <TrendingDown className="h-3 w-3 text-destructive" />
      default:
        return <Minus className="h-3 w-3 text-muted-foreground" />
    }
  }

  const getTrendColor = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return "text-accent"
      case "down":
        return "text-destructive"
      default:
        return "text-foreground"
    }
  }

  return (
    <div className="space-y-1">
      {channels.map((channel) => {
        const value = values[channel.id] || 0
        const history = valueHistory[channel.id]
        const unit = getUnit(channel.type)

        return (
          <div
            key={channel.id}
            className={cn(
              "p-2 rounded-lg border transition-all",
              isRunning ? "bg-card hover:bg-muted/50" : "bg-muted/30",
              history?.trend === "up" && "border-accent/30 bg-accent/5",
              history?.trend === "down" && "border-destructive/30 bg-destructive/5",
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-1">
                {getChannelIcon(channel.type)}
                <span className="text-xs font-medium text-foreground">{channel.name}</span>
              </div>
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                CH{201 + Number.parseInt(channel.id)}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <span className={cn("text-lg font-bold font-mono", getTrendColor(history?.trend || "stable"))}>
                  {value.toFixed(3)}
                </span>
                <span className="text-xs text-muted-foreground">{unit}</span>
              </div>

              <div className="flex items-center space-x-1">
                {getTrendIcon(history?.trend || "stable")}
                {isRunning && <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />}
              </div>
            </div>

            {/* Min/Max indicators could be added here */}
            <div className="mt-1 text-[10px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Canal {channel.type}</span>
                <span className={cn("font-mono", isRunning ? "text-primary" : "text-muted-foreground")}> 
                  {isRunning ? "ATIVO" : "PARADO"}
                </span>
              </div>
            </div>
          </div>
        )
      })}

      {channels.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhum canal configurado</p>
          <p className="text-sm">Configure os canais para visualizar os dados</p>
        </div>
      )}
    </div>
  )
}
