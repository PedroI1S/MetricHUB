import type { Meta, StoryObj } from '@storybook/nextjs'
import { ExperimentCard } from './experiment-card'

const commonHandlers = {
  onView: () => {},
  onExport: () => {},
  onDelete: () => {},
}

const meta: Meta<typeof ExperimentCard> = {
  title: 'Dashboard/ExperimentCard',
  component: ExperimentCard,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="p-6 max-w-md">
        <Story />
      </div>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof ExperimentCard>

export const Running: Story = {
  args: {
    experiment: {
      id: 'exp-001',
      name: 'Teste de Vibracao Turbina',
      collector_id: 'COL-ALPHA-01',
      start_timestamp_utc: Date.now() - 1000 * 60 * 18,
      status: 'running',
    },
    type: 'running',
    ...commonHandlers,
  },
}

export const Completed: Story = {
  args: {
    experiment: {
      id: 'exp-002',
      name: 'Validacao Termica da Linha B',
      collector_id: 'COL-BETA-07',
      start_timestamp_utc: Date.now() - 1000 * 60 * 60 * 7,
      status: 'completed',
      duration: 2 * 60 * 60,
    },
    type: 'completed',
    ...commonHandlers,
  },
}
