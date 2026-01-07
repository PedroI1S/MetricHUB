"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { authApi } from "@/lib/api"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    authApi.getStatus().then((s) => {
      if (s.logged_in) {
        router.push("/dashboard")
      }
    })
  }, [router])

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <LoginForm />
    </main>
  )
}
