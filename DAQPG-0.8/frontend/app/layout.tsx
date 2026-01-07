import "../styles/globals.css"
import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"

import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: "DAQPG",
  description: "Aquisição de Dados em Tempo Real",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
