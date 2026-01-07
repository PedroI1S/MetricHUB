"use client"

import { useEffect, useState, Suspense, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authApi, socketManager } from "@/lib/api"
import { Reports } from "@/components/reports/reports"
import { Navigation } from "@/components/layout/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, Database, ChevronRight, Search } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"

interface Experiment {
  id: string
  name: string
  collector_id: string
  start_timestamp_utc: number
  status: "running" | "completed"
  duration?: number
}

function RelatoriosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlExperimentId = searchParams.get("id")

  const [user, setUser] = useState<{ username: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [completedExperiments, setCompletedExperiments] = useState<Record<string, Experiment>>({})
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(urlExperimentId)
  const [searchQuery, setSearchQuery] = useState("")
  const selectedCardRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

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
    // Listen for experiments updates to show list
    socketManager.onExperimentsUpdate((data) => {
      setCompletedExperiments(data.completed)
    })
  }, [])

  // Se chegou com ID na URL, use-o
  useEffect(() => {
    if (urlExperimentId) {
      setSelectedExperimentId(urlExperimentId)
    }
  }, [urlExperimentId])

  // Scroll automático para o experimento selecionado na sidebar
  useEffect(() => {
    if (selectedExperimentId && selectedCardRef.current && scrollAreaRef.current && Object.keys(completedExperiments).length > 0) {
      // Aguarda um pouco para garantir que o DOM foi renderizado
      setTimeout(() => {
        const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement

        if (viewport && selectedCardRef.current) {
          // Calcula a posição do card em relação ao viewport
          const viewportRect = viewport.getBoundingClientRect()
          const cardRect = selectedCardRef.current.getBoundingClientRect()
          const cardHeight = selectedCardRef.current.offsetHeight
          const viewportHeight = viewport.clientHeight

          // Calcula a posição atual do card em relação ao scroll atual
          const currentScrollTop = viewport.scrollTop
          const cardTopRelativeToViewport = cardRect.top - viewportRect.top

          // Calcula a nova posição de scroll para centralizar o card
          const scrollPosition = currentScrollTop + cardTopRelativeToViewport - (viewportHeight / 2) + (cardHeight / 2)

          viewport.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
          })
        }
      }, 300)
    }
  }, [selectedExperimentId, completedExperiments])

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

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const handleSelectExperiment = (id: string) => {
    // Apenas atualiza o estado - SEM reload!
    setSelectedExperimentId(String(id))
  }

  const handleBack = () => {
    // Volta para a lista - SEM reload!
    setSelectedExperimentId(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  if (!user) {
    // Avoid double redirect if handled by useEffect
    return null
  }

  const hasExperiments = Object.keys(completedExperiments).length > 0

  // Filtrar experimentos baseado na busca
  const filteredExperiments = Object.values(completedExperiments).filter((exp) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      exp.name.toLowerCase().includes(query) ||
      exp.collector_id.toLowerCase().includes(query) ||
      String(exp.id).includes(query)
    )
  })

  // Se há um ID selecionado mas ainda não carregou os experimentos, mostra loading
  if (selectedExperimentId && !hasExperiments) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Carregando experimentos...</div>
      </div>
    )
  }

  // Se não há experimento selecionado, mostra apenas a lista centralizada
  if (!selectedExperimentId) {
    return (
      <main className="min-h-screen p-4 md:p-6 space-y-6">
        <Navigation
          user={user}
          onLogout={handleLogout}
          currentView="reports"
          onViewChange={handleViewChange}
        />

        <motion.div
          key="grid-view"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="max-w-4xl mx-auto"
        >
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-6 w-6 text-blue-600" />
              <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
              <Badge variant="secondary" className="ml-2">
                {Object.keys(completedExperiments).length}
              </Badge>
            </div>
            <p className="text-muted-foreground mb-4">
              Selecione um experimento para visualizar o relatório completo
            </p>

            {/* Campo de busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por nome, coletor ou ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {!hasExperiments ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Database className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhum experimento finalizado</p>
                <p className="text-sm mt-1">Complete uma medição para visualizar relatórios</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredExperiments.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Nenhum experimento encontrado</p>
                  <p className="text-sm">Tente ajustar sua busca</p>
                </div>
              ) : (
                filteredExperiments.map((experiment) => (
                  <Card
                    key={experiment.id}
                    className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                    onClick={() => handleSelectExperiment(experiment.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0 mr-2">
                          <h3 className="font-semibold text-foreground truncate text-lg">
                            {experiment.name}
                          </h3>
                          <p className="text-sm text-muted-foreground font-mono truncate">
                            {experiment.collector_id}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>
                            {formatDistanceToNow(new Date(experiment.start_timestamp_utc), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        {experiment.duration && (
                          <span className="font-medium">{formatDuration(experiment.duration)}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </motion.div>
      </main>
    )
  }

  // Se há experimento selecionado, mostra layout com sidebar
  return (
    <main className="min-h-screen p-4 md:p-6 space-y-6">
      <Navigation
        user={user}
        onLogout={handleLogout}
        currentView="reports"
        onViewChange={handleViewChange}
      />

      <motion.div
        key="sidebar-view"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex gap-6"
      >
        {/* Sidebar fixa com lista de experimentos */}
        <motion.aside
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-80 flex-shrink-0 border-r border-border bg-card rounded-lg"
        >
          <div className="p-4 border-b border-border">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold text-foreground">Relatórios</h2>
              <Badge variant="secondary" className="ml-auto">
                {Object.keys(completedExperiments).length}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Selecione um experimento
            </p>

            {/* Campo de busca na sidebar */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por nome ou ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-8 text-sm"
              />
            </div>
          </div>

          <ScrollArea ref={scrollAreaRef} className="h-[calc(100vh-320px)]">
            <div className="p-2 space-y-2">
              {filteredExperiments.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum resultado</p>
                </div>
              ) : (
                filteredExperiments.map((experiment) => {
                  const isSelected = selectedExperimentId === experiment.id || selectedExperimentId === String(experiment.id)
                  return (
                    <div
                      key={experiment.id}
                      ref={isSelected ? selectedCardRef : null}
                    >
                      <Card
                        className={`cursor-pointer transition-all hover:shadow-md ${isSelected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'hover:border-primary/50'
                          }`}
                        onClick={() => handleSelectExperiment(experiment.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0 mr-2">
                              <h3 className="font-semibold text-sm text-foreground truncate">
                                {experiment.name}
                              </h3>
                              <p className="text-xs text-muted-foreground font-mono truncate">
                                {experiment.collector_id}
                              </p>
                            </div>
                            {isSelected ? (
                              <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {formatDistanceToNow(new Date(experiment.start_timestamp_utc), {
                                  addSuffix: true,
                                  locale: ptBR,
                                })}
                              </span>
                            </div>
                            {experiment.duration && (
                              <span className="font-medium">{formatDuration(experiment.duration)}</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </motion.aside>

        {/* Área de conteúdo principal */}
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
          className="flex-1 min-w-0"
        >
          <Reports
            experimentId={selectedExperimentId}
            onBack={handleBack}
          />
        </motion.div>
      </motion.div>
    </main>
  )
}

export default function RelatoriosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    }>
      <RelatoriosContent />
    </Suspense>
  )
}
