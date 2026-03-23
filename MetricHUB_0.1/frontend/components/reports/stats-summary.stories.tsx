import type { Meta, StoryObj } from '@storybook/nextjs'
import { StatsSummary } from './stats-summary'

const channels = [
  { id: 'ch-01', name: 'Canal Tensao', type: 'volt' as const, enabled: true },
  { id: 'ch-02', name: 'Canal Temperatura', type: 'temp' as const, enabled: true },
  { id: 'ch-03', name: 'Canal Resistencia', type: 'res' as const, enabled: true },
]

const data = Array.from({ length: 24 }, (_, i) => ({
  time: i * 5,
  values: {
    'ch-01': 2.5 + Math.sin(i / 4) * 0.15,
    'ch-02': 36 + Math.cos(i / 6) * 1.7,
    'ch-03': 120 + Math.sin(i / 5) * 7,
  },
}))

const meta: Meta<typeof StatsSummary> = {
  title: 'Reports/StatsSummary',
  component: StatsSummary,
  parameters: {
    layout: 'padded',
  },
  args: {
    data,
    channels,
  },
}

export default meta

type Story = StoryObj<typeof StatsSummary>

export const Default: Story = {}

export const EmptyData: Story = {
  args: {
    data: [],
    channels,
  },
}
