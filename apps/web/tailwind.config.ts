import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/shared/src/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        judge: {
          bg: '#0e0f12',
          surface: '#15171c',
          panel: '#1a1d24',
          subtle: '#222630',
          border: '#2c313e',
          borderLight: '#3d4455',
          text: '#f1f3f7',
          muted: '#8e96a8',
          accent: '#d4a373', // warm bronze
          accentHover: '#e0b284',
          gold: '#eab308',
          amber: '#f59e0b'
        },
        board: {
          light: '#e8e2d4', // warm ivory / stone
          dark: '#5e6878',  // muted bronze-slate
          highlightLight: '#bfdbfe',
          highlightDark: '#60a5fa',
          checkLight: '#fca5a5',
          checkDark: '#ef4444'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
      }
    }
  },
  plugins: []
};

export default config;
