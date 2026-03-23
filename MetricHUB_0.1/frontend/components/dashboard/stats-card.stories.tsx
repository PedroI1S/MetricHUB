import type { Meta, StoryObj } from '@storybook/nextjs'
import { Activity, Thermometer, Zap, Circle } from 'lucide-react'
import { StatsCard } from './stats-card'

const meta: Meta<typeof StatsCard> = {
  title: 'Dashboard/StatsCard',
  component: StatsCard,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="p-6 max-w-sm">
        <Story />
      </div>
    ),
  ],
  args: {
    title: 'Canal Ativo',
    value: 12,
    icon: Activity,
    description: 'Atualizado agora',
    variant: 'default',
  },
}

export default meta

type Story = StoryObj<typeof StatsCard>

export const Default: Story = {}

export const Success: Story = {
  args: {
    title: 'Leitura Estavel',
    value: 98,
    icon: Zap,
    description: 'Sem anomalias nas ultimas 24h',
    variant: 'success',
  },
}

export const Accent: Story = {
  args: {
    title: 'Temperatura Media',
    value: 37,
    icon: Thermometer,
    description: 'Dentro da faixa recomendada',
    variant: 'accent',
  },
}

export const Muted: Story = {
  args: {
    title: 'Precisao Sensor',
    value: 99,
    icon: Circle,
    description: 'Calibracao pendente em 3 dias',
    variant: 'muted',
  },
}
