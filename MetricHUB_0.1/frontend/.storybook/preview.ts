import type { Preview } from '@storybook/nextjs'
import React from 'react'
import { ThemeProvider } from '@/components/theme-provider'
import '../styles/globals.css'

const preview: Preview = {
  decorators: [
    (Story) =>
      React.createElement(
        ThemeProvider,
        { attribute: 'class', defaultTheme: 'system', enableSystem: true, disableTransitionOnChange: true },
        React.createElement(Story)
      ),
  ],
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
  },
};

export default preview;