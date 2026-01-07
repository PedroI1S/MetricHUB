"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Download, FileText, BarChart3, Table, Calendar } from "lucide-react"
import { ReportChart } from "./report-chart"
import { DataTable } from "./data-table"
import { StatsSummary } from "./stats-summary"
import { socketManager } from "@/lib/api"
import { generatePDF } from "@/lib/pdf-generator"

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

interface ExperimentInfo {
  id: string
  name: string
  collector_id: string
  start_timestamp_utc: number
  end_timestamp_utc?: number
  config: Record<string, ChannelConfig>
  duration: number
}

interface ReportsProps {
  experimentId: string
  onBack: () => void
}

export function Reports({ experimentId, onBack }: ReportsProps) {
  const [experiment, setExperiment] = useState<ExperimentInfo | null>(null)
  const [data, setData] = useState<ReportData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    socketManager.connect()

    const handleHistory = (payload: any) => {
      if (!payload || String(payload.experiment_id) !== String(experimentId)) return
      const exp: ExperimentInfo = {
        id: String(payload.experiment_id),
        name: payload.name || `Experimento ${payload.experiment_id}`,
        collector_id: payload.collector_id || "",
        start_timestamp_utc: payload.start_timestamp_utc || Date.now(),
        end_timestamp_utc: payload.end_timestamp_utc || undefined,
        duration: payload.history?.length ? payload.history[payload.history.length - 1].time : 0,
        config: payload.config || {},
      }
      setExperiment(exp)
      const history = (payload.history || []).map((pt: any) => ({ time: pt.time, values: pt.values }))
      setData(history)
      setIsLoading(false)
    }

    socketManager.onExperimentHistory(handleHistory)
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
    }
  }, [experimentId])

  const handleExport = (format: "xlsx" | "csv" | "pdf") => {
    if (format === "xlsx") {
      socketManager.connect()
      socketManager.generateXLSX(experimentId)
    } else if (format === "pdf") {
      if (!experiment) return
      try {
        const activeChannels = Object.values(experiment.config).filter((ch: any) => ch.enabled)
        generatePDF(experiment, data, activeChannels)
        console.log('PDF gerado com sucesso!')
      } catch (error) {
        console.error('Erro ao gerar PDF:', error)
        alert('Erro ao gerar PDF: ' + (error as Error).message)
      }
    } else {
      console.log(`Exporting data as ${format}...`)
    }
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("pt-BR")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando relatório...</p>
        </div>
      </div>
    )
  }

  if (!experiment) {
    return <div>Experimento não encontrado</div>
  }

  const activeChannels = Object.values(experiment.config).filter((ch) => ch.enabled)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack} size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Relatório: {experiment.name}</h1>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>Coletor: {experiment.collector_id}</span>
              <span>•</span>
              <span>Duração: {formatDuration(experiment.duration)}</span>
              <span>•</span>
              <span>{data.length} pontos coletados</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")}>
            <Download className="h-4 w-4 mr-2" />
            XLSX
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Experiment Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Informações da Medição</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Início</p>
              <p className="text-sm">{formatDate(experiment.start_timestamp_utc)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fim</p>
              <p className="text-sm">
                {experiment.end_timestamp_utc ? formatDate(experiment.end_timestamp_utc) : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Duração Total</p>
              <p className="text-sm">{formatDuration(experiment.duration)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant="secondary" className="bg-accent/10 text-accent">
                Finalizada
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1. Gráfico - Primeiro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Gráfico Completo da Medição</span>
          </CardTitle>
          <CardDescription>Visualização de todos os dados coletados durante o experimento</CardDescription>
        </CardHeader>
        <CardContent className="h-[600px]">
          <ReportChart data={data} channels={activeChannels} />
        </CardContent>
      </Card>

      {/* 2. Tabela de Dados - Segundo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Table className="h-5 w-5" />
            <span>Tabela de Dados</span>
          </CardTitle>
          <CardDescription>Todos os pontos de dados coletados em formato tabular</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable data={data} channels={activeChannels} />
        </CardContent>
      </Card>

      {/* 3. Estatísticas dos Canais - Terceiro */}
      <StatsSummary data={data} channels={activeChannels} />
    </div>
  )
}
