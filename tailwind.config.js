/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      colors: {
        ink:              '#0A0A0A',
        'ink-soft':       '#1A1A1A',
        'ink-muted':      '#2A2A2A',
        cream:            '#F5F0E8',
        'cream-dark':     '#EDE8DF',
        gold:             '#F2C94C',
        'gold-light':     '#FFF8D6',
        rose:             '#FF6B9D',
        'rose-light':     '#FFD6E7',
        sky:              '#4A9EFF',
        'sky-light':      '#D6EAFF',
        mint:             '#4ECDC4',
        'mint-light':     '#D6F5F3',
        coral:            '#FF8C69',
        'coral-light':    '#FFE0D6',
        lavender:         '#B794F4',
        'lavender-light': '#EDE9FE',
      },
      boxShadow: {
        'card':       '0 2px 16px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.03)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
        'glow':       '0 0 40px rgba(242,201,76,0.3)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.5s ease-out',
        'fade':     'fade 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
