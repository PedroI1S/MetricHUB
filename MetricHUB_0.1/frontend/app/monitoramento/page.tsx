"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authApi, socketManager } from "@/lib/api"
import { Monitoring } from "@/components/monitoring/monitoring"
import { Navigation } from "@/components/layout/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, Eye, Clock, Activity } from "lucide-react"
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

function MonitoramentoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const experimentId = searchParams.get("id")
  const [user, setUser] = useState<{ username: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [runningExperiments, setRunningExperiments] = useState<Record<string, Experiment>>({})

  useEffect(() => {
    authApi.getStatus().then((s) => {
      if (!s.logged_in) {
        router.push("/")
      } else if (s.username && s.role) {
        setUser({ username: s.username, role: s.role })
        socketManager.connect()
      }
      setLoading(false)
    })

    return () => {
      socketManager.disconnect()
    }
  }, [router])

  useEffect(() => {
    if (!experimentId) {
      // Listen for experiments updates to show list
      socketManager.onExperimentsUpdate((data) => {
        setRunningExperiments(data.running)
      })
    }
  }, [experimentId])

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch { }
    socketManager.disconnect()
    socketManager.disconnect()
    router.push("/")
  }

  const handleViewChange = (view: string) => {
    if (view === "dashboard") {
      router.push("/dashboard")
    } else if (view === "config") {
      router.push("/configuracao")
    } else if (view === "monitoring") {
      router.push("/monitoramento")
    } else if (view === "reports") {
      router.push("/relatorios")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }
  // If no experiment ID, show list of running experiments
  if (!experimentId) {
    return (
      <main className="min-h-screen p-4 md:p-6 space-y-6">
        <Navigation
          user={user}
          onLogout={handleLogout}
          currentView="monitoring"
          onViewChange={handleViewChange}
        />

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Monitoramento</h1>
            <p className="text-muted-foreground">Selecione um experimento em andamento para monitorar em tempo real</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Play className="h-5 w-5 text-green-600" />
                <span>Experimentos em Andamento</span>
                <Badge variant="secondary" className="ml-auto">
                  {Object.keys(runningExperiments).length}
                </Badge>
              </CardTitle>
              <CardDescription>Clique em um experimento para monitorar em tempo real</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(runningExperiments).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhum experimento em andamento</p>
                  <p className="text-sm">Inicie uma nova medição para monitorar</p>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => router.push("/configuracao")}
                    className="mt-4"
                  >
                    Nova Medição
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.values(runningExperiments).map((experiment) => (
                    <Card key={experiment.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Play className="h-4 w-4 text-green-600" />
                            <h3 className="font-semibold text-foreground truncate">{experiment.name}</h3>
                          </div>
                          <Badge variant="secondary" className="bg-green-600/10 text-green-600">
                            Em andamento
                          </Badge>
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
                        </div>

                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => router.push(`/monitoramento?id=${experiment.id}`)}
                          className="w-full flex items-center justify-center space-x-2"
                        >
                          <Eye className="h-4 w-4" />
                          <span>Monitorar</span>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  // If experiment ID exists, show the monitoring view
  return (
    <main className="min-h-screen p-4 md:p-6 space-y-6">
      <Navigation
        user={user}
        onLogout={handleLogout}
        currentView="monitoring"
        onViewChange={handleViewChange}
      />
      <Monitoring
        experimentId={experimentId}
        onBack={() => router.push("/monitoramento")}
        onStop={(id) => {
          socketManager.stopExperiment(id)
          router.push(`/relatorios?id=${id}`)
        }}
      />
    </main>
  )
}

export default function MonitoramentoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    }>
      <MonitoramentoContent />
    </Suspense>
  )
}
