"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Square, Play, Pause, Download, Maximize2, ExternalLink, FileText } from "lucide-react"
import { RealtimeChart } from "./realtime-chart"
import { LiveValues } from "./live-values"
import { ChannelValuesTable } from "./channel-values-table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { socketManager } from "@/lib/api"
import { generatePDF } from "@/lib/pdf-generator"
import { useToast } from "@/hooks/use-toast"

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

interface MonitoringProps {
  experimentId: string
  onBack: () => void
  onStop: (experimentId: string) => void
}

export function Monitoring({ experimentId, onBack, onStop }: MonitoringProps) {
  const { toast } = useToast()
  const [experiment, setExperiment] = useState<ExperimentInfo | null>(null)
  const [data, setData] = useState<MonitoringData[]>([])
  const [latestValues, setLatestValues] = useState<Record<string, number>>({})
  const [isRunning, setIsRunning] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [timeRange, setTimeRange] = useState<number | null>(60) // Default: last 60 seconds (null = all data)
  const [isConnected, setIsConnected] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    socketManager.connect()

    const handleConnect = () => {
      setIsConnected(true)
      toast({ title: "Conectado", description: "Conexão com o servidor estabelecida." })
    }

    const handleDisconnect = () => {
      setIsConnected(false)
      toast({ title: "Desconectado", description: "Perda de conexão com o servidor.", variant: "destructive" })
    }

    socketManager.onConnect(handleConnect)
    socketManager.onDisconnect(handleDisconnect)

    const handleHistory = (payload: any) => {
      console.log('handleHistory received:', {
        experiment_id: payload?.experiment_id,
        historyLength: payload?.history?.length,
        configKeys: Object.keys(payload?.config || {}),
        is_running: payload?.is_running
      })

      if (!payload || String(payload.experiment_id) !== String(experimentId)) return
      const exp: ExperimentInfo = {
        id: String(payload.experiment_id),
        name: payload.name || `Experimento ${payload.experiment_id}`,
        collector_id: payload.collector_id || "",
        start_timestamp_utc: payload.start_timestamp_utc || Date.now(),
        config: payload.config || {},
        duration: undefined,
      }
      setExperiment(exp)
      const history = (payload.history || []).map((pt: any) => ({ time: pt.time, values: pt.values }))
      console.log('Setting data:', { historyLength: history.length, firstPoint: history[0] })
      setData(history)
      if (history.length) setLatestValues(history[history.length - 1].values)
      setIsRunning(!!payload.is_running)
    }

    const handleNewData = (payload: any) => {
      if (!payload || String(payload.experiment_id) !== String(experimentId)) return

      const point = payload.data
      setData((prev) => [...prev.slice(-299), { time: point.time, values: point.values }])
      setLatestValues(point.values)
    }

    socketManager.onExperimentHistory(handleHistory)
    socketManager.onNewData(handleNewData)
    socketManager.onXlsxGenerated(({ filename, data }) => {
      const a = document.createElement('a')
      a.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${data}`
      a.download = filename
      a.click()
    })
    socketManager.subscribeToExperiment(experimentId)

    return () => {
      socketManager.unsubscribeFromExperiment(experimentId)
      socketManager.disconnect()
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [experimentId])

  useEffect(() => {
    // Update elapsed time
    if (experiment && isRunning && !isPaused) {
      const timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - experiment.start_timestamp_utc) / 1000))
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [experiment, isRunning, isPaused])

  const startDataSimulation = () => { }

  const handleStop = () => {
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    onStop(experimentId)
  }

  const handlePause = () => {
    setIsPaused(!isPaused)
  }

  const handleExport = () => {
    if (!experiment) return
    socketManager.connect()
    socketManager.generateXLSX(experiment.id)
  }

  const handleGeneratePDF = () => {
    if (!experiment) return
    console.log('Gerando PDF...', { experiment, dataPoints: data.length, channels: activeChannels.length })
    try {
      // Use all data, not filtered data, for PDF
      generatePDF(experiment, data, activeChannels)
      console.log('PDF gerado com sucesso!')
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar PDF: ' + (error as Error).message)
    }
  }

  const handleOpenTableWindow = () => {
    const url = `/table.html?id=${experimentId}`
    window.open(url, '_blank', 'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no')
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  if (!experiment) {
    return <div>Carregando...</div>
  }

  const activeChannels = Object.values(experiment.config).filter((ch) => ch.enabled)

  // Filter data based on selected time range
  const filteredData = timeRange === null
    ? data
    : data.filter((point) => {
      const latestTime = data.length > 0 ? data[data.length - 1].time : 0
      return point.time >= latestTime - timeRange
    })

  return (
    <div className={`space-y-6 ${isFullscreen ? "fixed inset-0 z-50 bg-background p-6 overflow-auto" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {!isFullscreen && (
            <Button variant="outline" onClick={onBack} size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-foreground">{experiment.name}</h1>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>Coletor: {experiment.collector_id}</span>
              <span>•</span>
              <span>Tempo decorrido: {formatTime(elapsedTime)}</span>
              <span>•</span>
              <Badge variant={isConnected ? "default" : "destructive"} className="mr-2">
                {isConnected ? "Conectado" : "Desconectado"}
              </Badge>
              <Badge variant={isRunning ? "default" : "secondary"} className={isRunning ? "bg-primary" : ""}>
                {isRunning ? (isPaused ? "Pausado" : "Em execução") : "Finalizado"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
            <Maximize2 className="h-4 w-4" />
          </Button>
          {!isRunning && (
            <Button variant="outline" size="sm" onClick={handleGeneratePDF}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          )}
          {isRunning && (
            <Button variant="outline" size="sm" onClick={handlePause}>
              {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
              {isPaused ? "Retomar" : "Pausar"}
            </Button>
          )}
          {isRunning && (
            <Button variant="destructive" size="sm" onClick={handleStop}>
              <Square className="h-4 w-4 mr-2" />
              Parar
            </Button>
          )}
        </div>
      </div>

      {/* Status Alert */}
      {isPaused && (
        <Alert>
          <Pause className="h-4 w-4" />
          <AlertDescription>A coleta de dados está pausada. Clique em "Retomar" para continuar.</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Chart */}
        <div className="xl:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gráfico em Tempo Real</CardTitle>
                  <CardDescription>Visualização dos dados coletados em tempo real</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Escala:</span>
                  <Button
                    variant={timeRange === 30 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeRange(30)}
                  >
                    30s
                  </Button>
                  <Button
                    variant={timeRange === 60 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeRange(60)}
                  >
                    1min
                  </Button>
                  <Button
                    variant={timeRange === 300 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeRange(300)}
                  >
                    5min
                  </Button>
                  <Button
                    variant={timeRange === 600 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeRange(600)}
                  >
                    10min
                  </Button>
                  <Button
                    variant={timeRange === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeRange(null)}
                  >
                    Tudo
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[500px]">
              <RealtimeChart
                data={filteredData}
                channels={activeChannels}
                isRunning={isRunning && !isPaused}
                timeWindow={timeRange || undefined}
              />
            </CardContent>
          </Card>
        </div>

        {/* Live Values */}
        <div className="xl:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Valores ao Vivo</CardTitle>
              <CardDescription>Últimas leituras dos sensores</CardDescription>
            </CardHeader>
            <CardContent className="h-[500px] overflow-y-auto">
              <LiveValues channels={activeChannels} values={latestValues} isRunning={isRunning && !isPaused} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Channel Values Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Histórico de Valores</CardTitle>
              <CardDescription>Tabela com o histórico de todos os pontos coletados (últimos 100 pontos)</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenTableWindow}
              title="Abrir tabela em nova janela"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir em Nova Janela
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ChannelValuesTable
            data={data}
            channels={activeChannels}
            isRunning={isRunning && !isPaused}
            maxRows={100}
          />
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pontos Coletados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{data.length}</div>
            <p className="text-xs text-muted-foreground">Total de amostras</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Taxa de Amostragem</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">0.5 Hz</div>
            <p className="text-xs text-muted-foreground">Amostras por segundo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Canais Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{activeChannels.length}</div>
            <p className="text-xs text-muted-foreground">De 8 canais disponíveis</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
