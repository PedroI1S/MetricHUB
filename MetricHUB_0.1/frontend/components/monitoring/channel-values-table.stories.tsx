import type { Meta, StoryObj } from '@storybook/nextjs'
import { ChannelValuesTable } from './channel-values-table'

const channels = [
  { id: 'ch-01', name: 'Tensao A', type: 'volt' as const, enabled: true },
  { id: 'ch-02', name: 'Temperatura B', type: 'temp' as const, enabled: true },
  { id: 'ch-03', name: 'Resistencia C', type: 'res' as const, enabled: true },
]

const data = Array.from({ length: 180 }, (_, i) => ({
  time: i * 0.5,
  values: {
    'ch-01': 1.8 + Math.sin(i / 10) * 0.25,
    'ch-02': 32 + Math.cos(i / 14) * 2.4,
    'ch-03': 102 + Math.sin(i / 9) * 8,
  },
}))

const meta: Meta<typeof ChannelValuesTable> = {
  title: 'Monitoring/ChannelValuesTable',
  component: ChannelValuesTable,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="p-6">
        <Story />
      </div>
    ),
  ],
  args: {
    data,
    channels,
    isRunning: true,
    maxRows: 100,
  },
}

export default meta

type Story = StoryObj<typeof ChannelValuesTable>

export const Running: Story = {}

export const Paused: Story = {
  args: {
    isRunning: false,
  },
}

export const Empty: Story = {
  args: {
    data: [],
    isRunning: false,
  },
}

export const LimitedRows: Story = {
  args: {
    maxRows: 20,
  },
}
