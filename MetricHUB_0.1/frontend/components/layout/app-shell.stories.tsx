import { useEffect, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'
import { Navigation } from './navigation'
import { Dashboard } from '@/components/dashboard/dashboard'
import { Configuration } from '@/components/configuration/configuration'
import { Monitoring } from '@/components/monitoring/monitoring'
import { Reports } from '@/components/reports/reports'
import { Toaster } from '@/components/ui/toaster'

type ShellView = 'dashboard' | 'config' | 'monitoring' | 'reports'

interface AppShellPreviewProps {
  initialView: ShellView
}

function AppShellPreview({ initialView }: AppShellPreviewProps) {
  const [currentView, setCurrentView] = useState<ShellView>(initialView)
  const [selectedExperimentId, setSelectedExperimentId] = useState('demo-1')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('daqpg_demo_mode', 'true')
    }
  }, [])

  useEffect(() => {
    setCurrentView(initialView)
  }, [initialView])

  const handleViewChange = (view: string, experimentId?: string) => {
    if (view === 'dashboard' || view === 'config' || view === 'monitoring' || view === 'reports') {
      setCurrentView(view)
    }

    if (experimentId) {
      setSelectedExperimentId(String(experimentId))
    }
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onViewChange={handleViewChange} />
      case 'config':
        return (
          <Configuration
            onBack={() => setCurrentView('dashboard')}
            onStartExperiment={() => setCurrentView('dashboard')}
          />
        )
      case 'monitoring':
        return (
          <Monitoring
            experimentId={selectedExperimentId}
            onBack={() => setCurrentView('dashboard')}
            onStop={(experimentId) => {
              setSelectedExperimentId(experimentId)
              setCurrentView('reports')
            }}
          />
        )
      case 'reports':
        return <Reports experimentId={selectedExperimentId} onBack={() => setCurrentView('dashboard')} />
      default:
        return <Dashboard onViewChange={handleViewChange} />
    }
  }

  return (
    <main className="min-h-screen p-4 md:p-6 space-y-6">
      <Navigation
        user={{ username: 'demo.user', role: 'admin' }}
        onLogout={() => setCurrentView('dashboard')}
        currentView={currentView}
        onViewChange={(view) => handleViewChange(view)}
      />
      {renderCurrentView()}
      <Toaster />
    </main>
  )
}

const meta: Meta<typeof AppShellPreview> = {
  title: 'Pages/App Shell',
  component: AppShellPreview,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    initialView: {
      control: { type: 'select' },
      options: ['dashboard', 'config', 'monitoring', 'reports'],
    },
  },
  args: {
    initialView: 'dashboard',
  },
}

export default meta

type Story = StoryObj<typeof AppShellPreview>

export const Interactive: Story = {}

export const DashboardView: Story = {
  args: {
    initialView: 'dashboard',
  },
}

export const ConfigurationView: Story = {
  args: {
    initialView: 'config',
  },
}

export const MonitoringView: Story = {
  args: {
    initialView: 'monitoring',
  },
}

export const ReportsView: Story = {
  args: {
    initialView: 'reports',
  },
}
