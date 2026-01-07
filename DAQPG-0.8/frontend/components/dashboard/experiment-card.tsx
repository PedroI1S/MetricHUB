"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Download, Trash2, Play, CheckCircle, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Experiment {
  id: string
  name: string
  collector_id: string
  start_timestamp_utc: number
  status: "running" | "completed"
  duration?: number
}

interface ExperimentCardProps {
  experiment: Experiment
  type: "running" | "completed"
  onView: () => void
  onExport: () => void
  onDelete: () => void
}

export function ExperimentCard({ experiment, type, onView, onExport, onDelete }: ExperimentCardProps) {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const getStatusIcon = () => {
    return type === "running" ? (
      <Play className="h-4 w-4 text-primary" />
    ) : (
      <CheckCircle className="h-4 w-4 text-accent" />
    )
  }

  const getStatusBadge = () => {
    return type === "running" ? (
      <Badge variant="secondary" className="bg-primary/10 text-primary">
        Em andamento
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-accent/10 text-accent">
        Finalizada
      </Badge>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <h3 className="font-semibold text-foreground truncate">{experiment.name}</h3>
          </div>
          {getStatusBadge()}
        </div>

        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          <div className="flex items-center justify-between">
            <span>Coletor:</span>
            <span className="font-mono text-foreground">{experiment.collector_id}</span>
          </div>

          <div className="flex items-center justify-between">
            <span>Iniciado:</span>
            <span className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(experiment.start_timestamp_utc), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </span>
          </div>

          {type === "completed" && experiment.duration && (
            <div className="flex items-center justify-between">
              <span>Duração:</span>
              <span>{formatDuration(experiment.duration)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onView}
            className="flex-1 flex items-center space-x-1 bg-transparent"
          >
            <Eye className="h-3 w-3" />
            <span>Visualizar</span>
          </Button>

          {type === "completed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 bg-transparent"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
