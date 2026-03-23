import type { Meta, StoryObj } from '@storybook/nextjs'
import { Monitoring } from './monitoring'

const meta: Meta<typeof Monitoring> = {
  title: 'Pages/Monitoring',
  component: Monitoring,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('daqpg_demo_mode', 'true')
      }

      return (
        <div className="p-6">
          <Story />
        </div>
      )
    },
  ],
  args: {
    experimentId: 'demo-monitoring-01',
    onBack: () => {},
    onStop: () => {},
  },
}

export default meta

type Story = StoryObj<typeof Monitoring>

export const LiveView: Story = {}
