"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, BarChart3, Target } from "lucide-react"

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

interface StatsSummaryProps {
  data: ReportData[]
  channels: ChannelConfig[]
}

export function StatsSummary({ data, channels }: StatsSummaryProps) {
  const calculateStats = (channelId: string) => {
    const values = data.map((point) => point.values[channelId]).filter((v) => v != null)

    if (values.length === 0) {
      return { min: 0, max: 0, avg: 0, std: 0 }
    }

    const min = Math.min(...values)
    const max = Math.max(...values)
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length

    // Standard deviation
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length
    const std = Math.sqrt(variance)

    return { min, max, avg, std }
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {channels.map((channel) => {
        const stats = calculateStats(channel.id)
        const unit = getUnit(channel.type)

        return (
          <Card key={channel.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>{channel.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center space-x-2">
                  <TrendingDown className="h-3 w-3 text-destructive" />
                  <div>
                    <p className="text-muted-foreground">Mínimo</p>
                    <p className="font-mono font-medium">
                      {stats.min.toFixed(3)} {unit}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-3 w-3 text-accent" />
                  <div>
                    <p className="text-muted-foreground">Máximo</p>
                    <p className="font-mono font-medium">
                      {stats.max.toFixed(3)} {unit}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Target className="h-3 w-3 text-primary" />
                  <div>
                    <p className="text-muted-foreground">Média</p>
                    <p className="font-mono font-medium">
                      {stats.avg.toFixed(3)} {unit}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-3 w-3 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Desvio</p>
                    <p className="font-mono font-medium">
                      ±{stats.std.toFixed(3)} {unit}
                    </p>
                  </div>
                </div>
              </div>

              {/* Range indicator */}
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Faixa de variação</p>
                <div className="h-2 bg-muted rounded-full relative overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-destructive via-primary to-accent rounded-full"
                    style={{ width: "100%" }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{stats.min.toFixed(2)}</span>
                  <span>{stats.max.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
