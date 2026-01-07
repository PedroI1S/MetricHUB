"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: number
  icon: LucideIcon
  description?: string
  variant?: "default" | "success" | "accent" | "muted"
}

export function StatsCard({ title, value, icon: Icon, description, variant = "default" }: StatsCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return "bg-primary/5 border-primary/20"
      case "accent":
        return "bg-accent/5 border-accent/20"
      case "muted":
        return "bg-muted/50 border-muted"
      default:
        return "bg-card border-border"
    }
  }

  const getIconStyles = () => {
    switch (variant) {
      case "success":
        return "text-primary bg-primary/10"
      case "accent":
        return "text-accent bg-accent/10"
      case "muted":
        return "text-muted-foreground bg-muted"
      default:
        return "text-foreground bg-muted"
    }
  }

  return (
    <Card className={cn("transition-all hover:shadow-md", getVariantStyles())}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn("p-2 rounded-lg", getIconStyles())}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  )
}
