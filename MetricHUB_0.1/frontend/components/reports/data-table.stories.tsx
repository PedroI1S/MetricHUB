import type { Meta, StoryObj } from '@storybook/nextjs'
import { DataTable } from './data-table'

const channels = [
  { id: 'ch-01', name: 'Tensao', type: 'volt' as const, enabled: true },
  { id: 'ch-02', name: 'Temperatura', type: 'temp' as const, enabled: true },
  { id: 'ch-03', name: 'Resistencia', type: 'res' as const, enabled: true },
]

const manyRowsData = Array.from({ length: 140 }, (_, i) => ({
  time: i * 7,
  values: {
    'ch-01': 2.1 + Math.sin(i / 6) * 0.2,
    'ch-02': 35 + Math.cos(i / 11) * 3.1,
    'ch-03': 110 + Math.sin(i / 8) * 6,
  },
}))

const filteredLikeData = [
  { time: 0, values: { 'ch-01': 1.1213, 'ch-02': 28.2234, 'ch-03': 96.1032 } },
  { time: 63, values: { 'ch-01': 1.5412, 'ch-02': 29.1122, 'ch-03': 96.9554 } },
  { time: 126, values: { 'ch-01': 1.6789, 'ch-02': 30.0088, 'ch-03': 97.3302 } },
  { time: 189, values: { 'ch-01': 1.7541, 'ch-02': 30.4012, 'ch-03': 97.7710 } },
  { time: 252, values: { 'ch-01': 1.8015, 'ch-02': 30.8851, 'ch-03': 98.0261 } },
]

const meta: Meta<typeof DataTable> = {
  title: 'Reports/DataTable',
  component: DataTable,
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
    data: manyRowsData,
    channels,
  },
}

export default meta

type Story = StoryObj<typeof DataTable>

export const Paginated: Story = {}

export const SmallDataset: Story = {
  args: {
    data: filteredLikeData,
  },
}

export const Empty: Story = {
  args: {
    data: [],
  },
}
