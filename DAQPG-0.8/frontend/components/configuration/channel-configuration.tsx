"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Save, Zap, Thermometer, Gauge } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ChannelConfig {
  id: string
  name: string
  type: "none" | "volt" | "temp" | "res"
  enabled: boolean
  bottomLimit?: number
  topLimit?: number
}

interface ChannelConfigurationProps {
  channels: Record<string, ChannelConfig>
  collectorData: number[]
  onSave: (channels: Record<string, ChannelConfig>) => void
  onBack: () => void
}

const channelTypes = [
  { value: "none", label: "Nenhum", icon: null },
  { value: "volt", label: "Tensão (V)", icon: Zap },
  { value: "temp", label: "Temperatura (°C)", icon: Thermometer },
  { value: "res", label: "Resistência (Ω)", icon: Gauge },
]

export function ChannelConfiguration({ channels, collectorData, onSave, onBack }: ChannelConfigurationProps) {
  const [localChannels, setLocalChannels] = useState<Record<string, ChannelConfig>>(
    JSON.parse(JSON.stringify(channels)),
  )

  const handleChannelChange = (channelId: string, field: keyof ChannelConfig, value: any) => {
    setLocalChannels((prev) => ({
      ...prev,
      [channelId]: {
        ...prev[channelId],
        [field]: value,
      },
    }))
  }

  const handleSave = () => {
    onSave(localChannels)
    onBack()
  }

  const getChannelIcon = (type: string) => {
    const channelType = channelTypes.find((t) => t.value === type)
    if (channelType?.icon) {
      const Icon = channelType.icon
      return <Icon className="h-4 w-4" />
    }
    return null
  }

  const isReceivingData = (index: number) => {
    return collectorData[index] != null && collectorData[index] !== 0
  }

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
            <h1 className="text-3xl font-bold text-foreground">Configurar Canais</h1>
            <p className="text-muted-foreground">Configure os canais de medição individualmente</p>
          </div>
        </div>
        <Button onClick={handleSave} size="lg">
          <Save className="h-4 w-4 mr-2" />
          Salvar Configuração
        </Button>
      </div>

      {/* Channel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Object.entries(localChannels).map(([channelId, channel]) => {
          const channelIndex = Number.parseInt(channelId)
          const hasData = isReceivingData(channelIndex)
          const currentValue = collectorData[channelIndex] || 0

          return (
            <Card
              key={channelId}
              className={`transition-all ${channel.enabled ? "ring-2 ring-primary/20 bg-primary/5" : ""}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Canal {201 + channelIndex}</CardTitle>
                  <div className="flex items-center space-x-2">
                    {hasData && (
                      <Badge variant="secondary" className="bg-accent/10 text-accent text-xs">
                        Ativo
                      </Badge>
                    )}
                    <Switch
                      checked={channel.enabled}
                      onCheckedChange={(checked) => handleChannelChange(channelId, "enabled", checked)}
                    />
                  </div>
                </div>
                {hasData && (
                  <CardDescription className="font-mono text-sm">
                    Valor atual: {currentValue.toFixed(3)}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`name-${channelId}`} className="text-sm font-medium">
                    Nome do Canal
                  </Label>
                  <Input
                    id={`name-${channelId}`}
                    value={channel.name}
                    onChange={(e) => handleChannelChange(channelId, "name", e.target.value)}
                    placeholder={`Canal ${201 + channelIndex}`}
                    disabled={!channel.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`type-${channelId}`} className="text-sm font-medium">
                    Tipo de Medida
                  </Label>
                  <Select
                    value={channel.type}
                    onValueChange={(value) => handleChannelChange(channelId, "type", value)}
                    disabled={!channel.enabled}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        <div className="flex items-center space-x-2">
                          {getChannelIcon(channel.type)}
                          <span>{channelTypes.find((t) => t.value === channel.type)?.label}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {channelTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center space-x-2">
                            {type.icon && <type.icon className="h-4 w-4" />}
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Alert Limits */}
                <div className="flex space-x-2">
                  <div className="space-y-1 w-1/2">
                    <Label htmlFor={`bottomLimit-${channelId}`} className="text-xs font-medium">Limite Inferior</Label>
                    <Input
                      id={`bottomLimit-${channelId}`}
                      type="number"
                      value={channel.bottomLimit ?? ""}
                      onChange={e => handleChannelChange(channelId, "bottomLimit", e.target.value === "" ? undefined : Number(e.target.value))}
                      placeholder="Min"
                      disabled={!channel.enabled}
                    />
                  </div>
                  <div className="space-y-1 w-1/2">
                    <Label htmlFor={`topLimit-${channelId}`} className="text-xs font-medium">Limite Superior</Label>
                    <Input
                      id={`topLimit-${channelId}`}
                      type="number"
                      value={channel.topLimit ?? ""}
                      onChange={e => handleChannelChange(channelId, "topLimit", e.target.value === "" ? undefined : Number(e.target.value))}
                      placeholder="Max"
                      disabled={!channel.enabled}
                    />
                  </div>
                </div>

                {/* Data preview */}
                {channel.enabled && hasData && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Leitura:</span>
                      <span className="font-mono font-medium">
                        {currentValue.toFixed(3)}
                        {channel.type === "volt" && " V"}
                        {channel.type === "temp" && " °C"}
                        {channel.type === "res" && " Ω"}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo da Configuração</CardTitle>
          <CardDescription>Canais que serão incluídos na medição</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(localChannels)
              .filter((channel) => channel.enabled)
              .map((channel) => (
                <div key={channel.id} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  {getChannelIcon(channel.type)}
                  <div>
                    <p className="font-medium text-sm">{channel.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {channelTypes.find((t) => t.value === channel.type)?.label}
                    </p>
                  </div>
                </div>
              ))}

            {Object.values(localChannels).filter((channel) => channel.enabled).length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <p>Nenhum canal configurado</p>
                <p className="text-sm">Ative pelo menos um canal para continuar</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
