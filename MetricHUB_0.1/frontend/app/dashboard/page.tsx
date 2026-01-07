"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authApi, socketManager } from "@/lib/api"
import { Dashboard } from "@/components/dashboard/dashboard"
import { Navigation } from "@/components/layout/navigation"

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ username: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)

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

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch { }
    socketManager.disconnect()
    socketManager.disconnect()
    router.push("/")
  }

  const handleViewChange = (view: string, experimentId?: string) => {
    if (view === "dashboard") {
      router.push("/dashboard")
    } else if (view === "config") {
      router.push("/configuracao")
    } else if (view === "monitoring") {
      if (experimentId) {
        router.push(`/monitoramento?id=${experimentId}`)
      } else {
        router.push("/monitoramento")
      }
    } else if (view === "reports") {
      if (experimentId) {
        router.push(`/relatorios?id=${experimentId}`)
      } else {
        router.push("/relatorios")
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <main className="min-h-screen p-4 md:p-6 space-y-6">
      <Navigation
        user={user}
        onLogout={handleLogout}
        currentView="dashboard"
        onViewChange={handleViewChange}
      />
      <Dashboard onViewChange={handleViewChange} />
    </main>
  )
}
