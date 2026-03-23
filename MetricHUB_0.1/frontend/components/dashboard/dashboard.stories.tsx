import type { Meta, StoryObj } from '@storybook/nextjs'
import { Dashboard } from './dashboard'

const meta: Meta<typeof Dashboard> = {
  title: 'Pages/Dashboard',
  component: Dashboard,
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
    onViewChange: () => {},
  },
}

export default meta

type Story = StoryObj<typeof Dashboard>

export const Default: Story = {}
