import { createSystem, defaultConfig } from '@chakra-ui/react'

const customConfig = {
  theme: {
    tokens: {
      fonts: {
        heading: { value: `'Crimson Text', Georgia, serif` },
        body: { value: `'Crimson Text', Georgia, serif` },
      },
      colors: {
        primary: {
          50: { value: '#e8f5e9' },
          100: { value: '#c8e6c9' },
          200: { value: '#a3b18a' },
          300: { value: '#81c784' },
          400: { value: '#66bb6a' },
          500: { value: '#3a5a40' },
          600: { value: '#2e4a33' },
          700: { value: '#1b5e20' },
          800: { value: '#1b4d20' },
          900: { value: '#0d3d10' },
        },
        secondary: {
          50: { value: '#f1f8e9' },
          100: { value: '#dcedc8' },
          200: { value: '#c5e1a5' },
          300: { value: '#aed581' },
          400: { value: '#9ccc65' },
          500: { value: '#588157' },
          600: { value: '#7cb342' },
          700: { value: '#689f38' },
          800: { value: '#558b2f' },
          900: { value: '#33691e' },
        },
        accent: {
          50: { value: '#f9fbe7' },
          100: { value: '#f0f4c3' },
          200: { value: '#e6ee9c' },
          300: { value: '#dce775' },
          400: { value: '#d4e157' },
          500: { value: '#a3b18a' },
          600: { value: '#c0ca33' },
          700: { value: '#afb42b' },
          800: { value: '#9e9d24' },
          900: { value: '#827717' },
        },
        background: { value: '#fdfbf7' },
        surface: { value: '#f4f1e8' },
        border: { value: '#e8dcc4' },
      },
    },
  },
}

export const system = createSystem(defaultConfig, customConfig)

