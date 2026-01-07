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
        window.location.href = "/"
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
    } catch {}
    socketManager.disconnect()
    window.location.href = "/"
  }

  const handleViewChange = (view: string, experimentId?: string) => {
    if (view === "dashboard") {
      window.location.href = "/dashboard"
    } else if (view === "config") {
      window.location.href = "/configuracao"
    } else if (view === "monitoring") {
      if (experimentId) {
        window.location.href = `/monitoramento?id=${experimentId}`
      } else {
        // Go to monitoring list page
        window.location.href = "/monitoramento"
      }
    } else if (view === "reports") {
      if (experimentId) {
        window.location.href = `/relatorios?id=${experimentId}`
      } else {
        // Go to reports list page
        window.location.href = "/relatorios"
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
