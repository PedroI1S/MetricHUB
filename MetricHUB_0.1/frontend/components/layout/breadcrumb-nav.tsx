"use client"

import { ChevronRight, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BreadcrumbItem {
  label: string
  onClick?: () => void
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[]
  onHome: () => void
}

export function BreadcrumbNav({ items, onHome }: BreadcrumbNavProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
      <Button
        variant="ghost"
        size="sm"
        onClick={onHome}
        className={`h-8 px-2 hover:text-foreground ${items.length === 0 ? 'text-foreground font-medium' : ''}`}
      >
        <Home className="h-4 w-4 mr-1" />
        <span>Dashboard</span>
      </Button>

      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <ChevronRight className="h-4 w-4" />
          {item.onClick && index < items.length - 1 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={item.onClick}
              className="h-8 px-2 hover:text-foreground"
            >
              {item.label}
            </Button>
          ) : (
            <span className={index === items.length - 1 ? "font-medium text-foreground" : ""}>
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}
