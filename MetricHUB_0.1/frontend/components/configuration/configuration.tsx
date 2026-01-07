"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Settings, Play, AlertCircle, Wifi, WifiOff } from "lucide-react"
import { ChannelConfiguration } from "./channel-configuration"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { socketManager } from "@/lib/api"

interface Collector {
  id: string
  status: "online" | "offline" | "running"
  lastSeen: number
  latestData?: number[]
}

interface ChannelConfig {
  id: string
  name: string
  type: "none" | "volt" | "temp" | "res"
  enabled: boolean
}

interface ConfigurationProps {
  onBack: () => void
  onStartExperiment: (config: any) => void
}

export function Configuration({ onBack, onStartExperiment }: ConfigurationProps) {
  const [collectors, setCollectors] = useState<Record<string, Collector>>({})
  const [selectedCollector, setSelectedCollector] = useState<string>("")
  const [experimentName, setExperimentName] = useState("")
  const [saveInterval, setSaveInterval] = useState("10")
  const [duration, setDuration] = useState("0")
  const [channelConfig, setChannelConfig] = useState<Record<string, ChannelConfig>>({})
  const [showChannelConfig, setShowChannelConfig] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Connect to socket and get real collectors data
    socketManager.connect()

    // Listen for collectors updates
    socketManager.onCollectorsUpdate((data) => {
      const transformedCollectors: Record<string, Collector> = {}
      Object.entries(data).forEach(([collectorId, collector]: [string, any]) => {
        transformedCollectors[collectorId] = {
          id: collectorId,
          status: collector.status === "running" ? "running" : "online",
          lastSeen: collector.last_seen ? collector.last_seen * 1000 : Date.now(),
          latestData: collector.latest_data || []
        }
      })
      setCollectors(transformedCollectors)
    })

    // Listen for initial config
    socketManager.onInitialConfig((config: Record<string, ChannelConfig>) => {
      setChannelConfig(config)
    })

    return () => {
      socketManager.disconnect()
    }
  }, [])

  const handleCollectorChange = (collectorId: string) => {
    setSelectedCollector(collectorId)
    const collector = collectors[collectorId]

    if (collector && collector.latestData) {
      // Auto-enable channels that are receiving data
      const updatedChannels = { ...channelConfig }
      collector.latestData.forEach((value, index) => {
        if (value !== 0 && value != null) {
          updatedChannels[index.toString()].enabled = true
          // Set default type based on value range
          if (value < 5) {
            updatedChannels[index.toString()].type = "volt"
          } else if (value > 100) {
            updatedChannels[index.toString()].type = "temp"
          } else {
            updatedChannels[index.toString()].type = "res"
          }
        }
      })
      setChannelConfig(updatedChannels)
    }
  }

  const handleConfigureChannels = () => {
    setShowChannelConfig(true)
  }

  const handleStartExperiment = async () => {
    if (!selectedCollector || !experimentName.trim()) return

    setIsLoading(true)

    const config = {
      collector_id: selectedCollector,
      name: experimentName,
      interval: Number.parseInt(saveInterval),
      duration: Number.parseInt(duration),
      config: channelConfig,
    }

    try {
      // Use socket manager to start experiment
      socketManager.startExperiment(config)
      onStartExperiment(config)
    } catch (error) {
      console.error("Error starting experiment:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getCollectorStatusIcon = (status: Collector["status"]) => {
    switch (status) {
      case "online":
        return <Wifi className="h-4 w-4 text-primary" />
      case "running":
        return <Play className="h-4 w-4 text-accent" />
      case "offline":
        return <WifiOff className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getCollectorStatusBadge = (status: Collector["status"]) => {
    switch (status) {
      case "online":
        return (
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Online
          </Badge>
        )
      case "running":
        return (
          <Badge variant="secondary" className="bg-accent/10 text-accent">
            Em uso
          </Badge>
        )
      case "offline":
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            Offline
          </Badge>
        )
    }
  }

  const canStart = selectedCollector && experimentName.trim() && Object.values(channelConfig).some((ch) => ch.enabled)

  if (showChannelConfig) {
    return (
      <ChannelConfiguration
        channels={channelConfig}
        collectorData={collectors[selectedCollector]?.latestData || []}
        onSave={setChannelConfig}
        onBack={() => setShowChannelConfig(false)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={onBack} size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurar Nova Medição</h1>
          <p className="text-muted-foreground">Configure os parâmetros para iniciar uma nova coleta de dados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Configuração Básica</span>
              </CardTitle>
              <CardDescription>Defina os parâmetros principais da medição</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="collector">Coletor de Dados</Label>
                  <Select value={selectedCollector} onValueChange={handleCollectorChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um coletor" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(collectors).map(([id, collector]) => (
                        <SelectItem key={id} value={id} disabled={collector.status === "offline"}>
                          <div className="flex items-center space-x-2">
                            {getCollectorStatusIcon(collector.status)}
                            <span>{id}</span>
                            {collector.status === "running" && (
                              <span className="text-xs text-muted-foreground">(Em uso)</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Medição</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Teste Bloco A - 25°C"
                    value={experimentName}
                    onChange={(e) => setExperimentName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interval">Intervalo para Salvar (s)</Label>
                  <Input
                    id="interval"
                    type="number"
                    min="1"
                    value={saveInterval}
                    onChange={(e) => setSaveInterval(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Tempo de Coleta (s)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="0"
                    placeholder="0 para parada manual"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Channel Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Configuração de Canais</CardTitle>
              <CardDescription>Configure os canais de medição que serão utilizados</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedCollector ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        Canais configurados: {Object.values(channelConfig).filter((ch) => ch.enabled).length}/8
                      </p>
                      <p className="text-xs text-muted-foreground">Canais ativos serão incluídos na medição</p>
                    </div>
                    <Button onClick={handleConfigureChannels} variant="outline">
                      Configurar Canais
                    </Button>
                  </div>

                  {Object.values(channelConfig).filter((ch) => ch.enabled).length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.values(channelConfig)
                        .filter((ch) => ch.enabled)
                        .map((channel) => (
                          <div key={channel.id} className="p-2 bg-muted rounded-lg text-center">
                            <p className="text-xs font-medium">{channel.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{channel.type}</p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Selecione um coletor para configurar os canais de medição</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={onBack}>
              Cancelar
            </Button>
            <Button onClick={handleStartExperiment} disabled={!canStart || isLoading} size="lg">
              {isLoading ? (
                "Iniciando..."
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Medição
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Sidebar - Collector Status */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status dos Coletores</CardTitle>
              <CardDescription>Dispositivos disponíveis para coleta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(collectors).map(([id, collector]) => (
                <div key={id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getCollectorStatusIcon(collector.status)}
                    <div>
                      <p className="font-medium text-sm">{id}</p>
                      <p className="text-xs text-muted-foreground">
                        {collector.status === "offline"
                          ? "Desconectado"
                          : `Ativo há ${Math.floor((Date.now() - collector.lastSeen) / 60000)}min`}
                      </p>
                    </div>
                  </div>
                  {getCollectorStatusBadge(collector.status)}
                </div>
              ))}
            </CardContent>
          </Card>

          {selectedCollector && collectors[selectedCollector]?.latestData && (
            <Card>
              <CardHeader>
                <CardTitle>Dados Atuais</CardTitle>
                <CardDescription>Últimas leituras do coletor selecionado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {collectors[selectedCollector].latestData!.map((value, index) => (
                    <div key={index} className="flex justify-between p-2 bg-muted rounded">
                      <span>CH{201 + index}:</span>
                      <span className="font-mono">{value.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
