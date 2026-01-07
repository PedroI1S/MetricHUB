"use client"

import type React from "react"

import { useState } from "react"
import { authApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Activity, Lock, User } from "lucide-react"
import { useRouter } from "next/navigation"

export function LoginForm() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const data = await authApi.login({ username, password })
      if (data.success) {
        // If successful, navigate to dashboard
        router.push("/dashboard")
      } else {
        setError(data.message || "Credenciais inválidas")
      }
    } catch (error) {
      // Auto-activate demo mode context
      console.error(error)
      setError("Erro de conexão. Ativando Modo Demo...")
      import("@/lib/api").then(({ enableDemoMode }) => {
        enableDemoMode()
        setTimeout(() => router.push("/dashboard"), 1500)
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-secondary/20">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-12 grid md:grid-cols-2 gap-8 items-center">
        {/* Branding (desktop) */}
        <div className="hidden md:block">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-4 bg-secondary rounded-2xl shadow-sm">
              <Activity className="h-10 w-10 text-secondary-foreground" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground">Atlas DAQ</h1>
              <p className="text-muted-foreground">Sistema de Aquisição de Dados</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-md">
            Monitore medições em tempo real com exportação rápida e painel responsivo. Entre para iniciar uma nova
            medição ou revisar relatórios.
          </p>
        </div>

        {/* Login card */}
        <div className="w-full max-w-md mx-auto md:ml-auto">
          {/* Logo (mobile) */}
          <div className="md:hidden text-center space-y-2 mb-4">
            <div className="flex items-center justify-center">
              <div className="p-3 bg-secondary rounded-xl">
                <Activity className="h-8 w-8 text-secondary-foreground" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Atlas DAQ</h1>
            <p className="text-muted-foreground">Sistema de Aquisição de Dados</p>
          </div>

          <Card className="shadow-lg border bg-card/70 backdrop-blur-sm">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold">Entrar no Sistema</CardTitle>
              <CardDescription>Digite suas credenciais para acessar o painel de controle</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">
                    Usuário
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="Digite seu usuário"
                      value={username}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={isLoading} size="lg" variant="secondary">
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </form>

              {/* Demo credentials */}
              <div className="mt-6 p-4 bg-muted/60 rounded-lg">
                <p className="text-sm text-muted-foreground text-center mb-2">Credenciais de demonstração:</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Admin:</span>
                    <span className="font-mono">admin / admin</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Usuário:</span>
                    <span className="font-mono">user / user</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground mt-6">
            <p>Projeto Atlas - Sistema de Monitoramento v2.0</p>
          </div>
        </div>
      </div>
    </div>
  )
}
