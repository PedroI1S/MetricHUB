"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Play, CheckCircle, Clock, Activity, Database, TrendingUp } from "lucide-react"
import { ExperimentCard } from "./experiment-card"
import { StatsCard } from "./stats-card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { socketManager } from "@/lib/api"

interface Experiment {
  id: string
  name: string
  collector_id: string
  start_timestamp_utc: number
  status: "running" | "completed"
  duration?: number
}

interface DashboardStats {
  totalExperiments: number
  runningExperiments: number
  completedExperiments: number
  activeCollectors: number
}

interface DashboardProps {
  onViewChange?: (view: string, experimentId?: string) => void
}

export function Dashboard({ onViewChange }: DashboardProps) {
  const [runningExperiments, setRunningExperiments] = useState<Record<string, Experiment>>({})
  const [completedExperiments, setCompletedExperiments] = useState<Record<string, Experiment>>({})
  const [collectors, setCollectors] = useState<Record<string, any>>({})
  const [stats, setStats] = useState<DashboardStats>({
    totalExperiments: 0,
    runningExperiments: 0,
    completedExperiments: 0,
    activeCollectors: 0,
  })
  const runningScrollRef = useRef<HTMLDivElement | null>(null)
  const completedScrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Connect to socket and setup listeners
    socketManager.connect()

    // Listen for experiments updates
    socketManager.onExperimentsUpdate((data) => {
      setRunningExperiments(data.running)
      setCompletedExperiments(data.completed)
    })

    // Listen for collectors updates
    socketManager.onCollectorsUpdate((data) => {
      setCollectors(data)
    })

    // Listen for XLSX file generation
    socketManager.onXlsxGenerated((payload) => {
      const { filename, data } = payload
      const blob = new Blob([Uint8Array.from(atob(data), (c) => c.charCodeAt(0))], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    })

    return () => {
      socketManager.disconnect()
    }
  }, [])

  useEffect(() => {
    // Update stats when data changes
    const runningCount = Object.keys(runningExperiments).length
    const completedCount = Object.keys(completedExperiments).length
    const collectorsCount = Object.keys(collectors).length

    setStats({
      totalExperiments: runningCount + completedCount,
      runningExperiments: runningCount,
      completedExperiments: completedCount,
      activeCollectors: collectorsCount,
    })

    // Reset scroll positions when experiments update
    if (runningScrollRef.current) {
      const viewport = runningScrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (viewport) viewport.scrollTop = 0
    }
    if (completedScrollRef.current) {
      const viewport = completedScrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (viewport) viewport.scrollTop = 0
    }
  }, [runningExperiments, completedExperiments, collectors])

  const handleStartNewExperiment = () => {
    if (onViewChange) {
      onViewChange("config")
    }
  }

  const handleViewExperiment = (experimentId: string, type: "running" | "completed") => {
    if (onViewChange) {
      const view = type === "running" ? "monitoring" : "reports"
      onViewChange(view, experimentId)
    }
  }

  const handleExportExperiment = (experimentId: string) => {
    socketManager.generateXLSX(experimentId)
  }

  const handleDeleteExperiment = (experimentId: string) => {
    socketManager.deleteExperiment(experimentId)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Gerencie suas medições e monitore o sistema em tempo real</p>
        </div>
        <Button onClick={handleStartNewExperiment} size="lg" className="flex items-center space-x-2">
          <Plus className="h-5 w-5" />
          <span>Nova Medição</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total de Medições"
          value={stats.totalExperiments}
          icon={Database}
          description="Todas as medições registradas"
        />
        <StatsCard
          title="Em Andamento"
          value={stats.runningExperiments}
          icon={Play}
          description="Medições ativas no momento"
          variant="success"
        />
        <StatsCard
          title="Finalizadas"
          value={stats.completedExperiments}
          icon={CheckCircle}
          description="Medições concluídas"
          variant="muted"
        />
        <StatsCard
          title="Coletores Ativos"
          value={stats.activeCollectors}
          icon={Activity}
          description="Dispositivos conectados"
          variant="accent"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Play className="h-5 w-5 text-green-600" />
              <span>Medições em Andamento</span>
              <Badge variant="secondary" className="ml-auto">
                {stats.runningExperiments}
              </Badge>
            </CardTitle>
            <CardDescription>Experimentos coletando dados em tempo real</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.values(runningExperiments).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma medição em andamento</p>
                <p className="text-sm">Inicie uma nova medição para começar</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4" ref={runningScrollRef}>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {Object.values(runningExperiments).map((experiment) => (
                    <ExperimentCard
                      key={experiment.id}
                      experiment={experiment}
                      type="running"
                      onView={() => handleViewExperiment(experiment.id, "running")}
                      onExport={() => handleExportExperiment(experiment.id)}
                      onDelete={() => handleDeleteExperiment(experiment.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <CardTitle>Últimas Medições</CardTitle>
                <Badge variant="secondary">
                  {Math.min(Object.values(completedExperiments).length, 4)}
                </Badge>
              </div>
              {Object.values(completedExperiments).length > 4 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = "/relatorios"}
                  className="cursor-pointer"
                >
                  Mostrar todas as medições
                </Button>
              )}
            </div>
            <CardDescription>As 4 medições mais recentes concluídas</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.values(completedExperiments).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma medição finalizada</p>
                <p className="text-sm">Complete uma medição para ver o histórico</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4" ref={completedScrollRef}>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {Object.values(completedExperiments)
                    .sort((a, b) => b.start_timestamp_utc - a.start_timestamp_utc)
                    .slice(0, 4)
                    .map((experiment) => (
                      <ExperimentCard
                        key={experiment.id}
                        experiment={experiment}
                        type="completed"
                        onView={() => handleViewExperiment(experiment.id, "completed")}
                        onExport={() => handleExportExperiment(experiment.id)}
                        onDelete={() => handleDeleteExperiment(experiment.id)}
                      />
                    ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {Object.keys(collectors).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-600" />
              <span>Coletores Ativos</span>
              <Badge variant="secondary" className="ml-auto">
                {stats.activeCollectors}
              </Badge>
            </CardTitle>
            <CardDescription>Dispositivos conectados e disponíveis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(collectors).map(([collectorId, collector]) => (
                <div key={collectorId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">{collectorId}</span>
                  </div>
                  <Badge variant={collector.status === "running" ? "default" : "secondary"}>
                    {collector.status || "idle"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}