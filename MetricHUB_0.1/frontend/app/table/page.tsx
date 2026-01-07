"use client"

import { useState, useEffect, Suspense } from "react"
import { ChannelValuesTable } from "@/components/monitoring/channel-values-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { socketManager } from "@/lib/api"
import { useSearchParams } from "next/navigation"

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

interface ExperimentInfo {
  id: string
  name: string
  collector_id: string
  start_timestamp_utc: number
  config: Record<string, ChannelConfig>
  duration?: number
}

function TableContent() {
  const searchParams = useSearchParams()
  const experimentId = searchParams.get('id')
  const [experiment, setExperiment] = useState<ExperimentInfo | null>(null)
  const [data, setData] = useState<MonitoringData[]>([])
  const [isRunning, setIsRunning] = useState(true)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    if (!experimentId) return

    socketManager.connect()

    const handleHistory = (payload: any) => {
      if (!payload || String(payload.experiment_id) !== String(experimentId)) return
      const exp: ExperimentInfo = {
        id: String(payload.experiment_id),
        name: payload.config?.name || `Experimento ${payload.experiment_id}`,
        collector_id: payload.config?.collector_id || "",
        start_timestamp_utc: Date.now() - (payload.history?.[0]?.time ? payload.history[0].time * 1000 : 0),
        config: payload.config || {},
        duration: undefined,
      }
      setExperiment(exp)
      const history = (payload.history || []).map((pt: any) => ({ time: pt.time, values: pt.values }))
      setData(history)
      setIsRunning(!!payload.is_running)
    }

    const handleNewData = (payload: any) => {
      if (!payload || String(payload.experiment_id) !== String(experimentId)) return
      const point = payload.data
      setData((prev) => [...prev.slice(-299), { time: point.time, values: point.values }])
    }

    socketManager.onExperimentHistory(handleHistory)
    socketManager.onNewData(handleNewData)
    socketManager.subscribeToExperiment(experimentId)

    return () => {
      socketManager.unsubscribeFromExperiment(experimentId)
      socketManager.disconnect()
    }
  }, [experimentId])

  useEffect(() => {
    if (experiment && isRunning) {
      const timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - experiment.start_timestamp_utc) / 1000))
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [experiment, isRunning])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  if (!experimentId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2 text-destructive">Erro</h2>
          <p className="text-muted-foreground">ID do experimento não fornecido</p>
        </div>
      </div>
    )
  }

  if (!experiment) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Carregando...</h2>
          <p className="text-muted-foreground">Conectando ao experimento</p>
        </div>
      </div>
    )
  }

  const activeChannels = Object.values(experiment.config).filter((ch) => ch.enabled)

  return (
    <div className="min-h-screen bg-background p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{experiment.name} - Histórico de Dados</CardTitle>
              <CardDescription className="mt-2">
                <div className="flex items-center space-x-4">
                  <span>Coletor: {experiment.collector_id}</span>
                  <span>•</span>
                  <span>Tempo decorrido: {formatTime(elapsedTime)}</span>
                  <span>•</span>
                  <Badge variant={isRunning ? "default" : "secondary"}>
                    {isRunning ? "Em execução" : "Finalizado"}
                  </Badge>
                  <span>•</span>
                  <span className="text-primary font-medium">{data.length} pontos coletados</span>
                </div>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChannelValuesTable 
            data={data}
            channels={activeChannels} 
            isRunning={isRunning}
            maxRows={200}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default function TablePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Carregando...</h2>
          <p className="text-muted-foreground">Preparando tabela...</p>
        </div>
      </div>
    }>
      <TableContent />
    </Suspense>
  )
}
