import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Holiday-theme-aware accent — overridden via CSS var by ThemeProvider
        accent:       'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        // Far East Property Management brand colors
        blue: {
          DEFAULT: '#1B3A8C',
          dark:    '#142D6E',
          light:   '#2448A8',
        },
        black:          '#0A0A0A',
        charcoal:       '#1A1A1A',
        'off-white':    '#F8F6F3',
        'grey-light':   '#E8E4E0',
        'grey-medium':  '#9E9A96',
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        hero:  ['4.5rem',  { lineHeight: '1.1',  letterSpacing: '0.04em' }],
        h1:    ['3rem',    { lineHeight: '1.15' }],
        h2:    ['2.25rem', { lineHeight: '1.2'  }],
        h3:    ['1.5rem',  { lineHeight: '1.25' }],
        price: ['2rem',    { lineHeight: '1.2',  letterSpacing: '0.04em' }],
      },
      letterSpacing: {
        tight:  '-0.02em',
        wide:   '0.04em',
        wider:  '0.08em',
      },
      maxWidth: {
        site: '1280px',
      },
      borderRadius: {
        none: '0px',
        sm:   '2px',
        md:   '4px',
      },
      boxShadow: {
        card:         '0 2px 12px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.12)',
        overlay:      '0 4px 24px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
}

export default config
