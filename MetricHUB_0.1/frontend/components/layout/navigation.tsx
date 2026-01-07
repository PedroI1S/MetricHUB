"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Activity, BarChart3, Settings, Play, FileText, LogOut, Menu, X, User } from "lucide-react"

interface NavigationProps {
  user: { username: string; role: string } | null
  onLogout: () => void
  currentView: string
  onViewChange: (view: string) => void
}

const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "config", label: "Configuração", icon: Settings },
  { id: "monitoring", label: "Monitoramento", icon: Play },
  { id: "reports", label: "Relatórios", icon: FileText },
]

export function Navigation({ user, onLogout, currentView, onViewChange }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <nav className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and brand - now clickable */}
          <button
            onClick={() => onViewChange("dashboard")}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="p-2 bg-primary rounded-lg">
              <Activity className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Atlas DAQ</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Sistema de Aquisição de Dados</p>
            </div>
          </button>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.id}
                  variant={currentView === item.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onViewChange(item.id)}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              )
            })}
          </div>

          {/* User info and logout */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2 text-sm">
              <div className="p-1.5 bg-muted rounded-full">
                <User className="h-3 w-3" />
              </div>
              <div className="text-right">
                <p className="font-medium text-foreground">{user?.username}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="hidden sm:flex items-center space-x-2 bg-transparent"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile navigation menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.id}
                  variant={currentView === item.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    onViewChange(item.id)
                    setIsMobileMenuOpen(false)
                  }}
                  className="w-full justify-start space-x-2 cursor-pointer"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              )
            })}

            {/* Mobile user info and logout */}
            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex items-center space-x-2 px-3 py-2 text-sm">
                <div className="p-1.5 bg-muted rounded-full">
                  <User className="h-3 w-3" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{user?.username}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="w-full justify-start space-x-2 bg-transparent"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
