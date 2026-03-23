import type { Meta, StoryObj } from '@storybook/nextjs'
import { Reports } from './reports'

const meta: Meta<typeof Reports> = {
  title: 'Pages/Reports',
  component: Reports,
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
    experimentId: 'demo-report-01',
    onBack: () => {},
  },
}

export default meta

type Story = StoryObj<typeof Reports>

export const Default: Story = {}
