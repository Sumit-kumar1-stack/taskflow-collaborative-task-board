import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#070b14',
        panel: '#0d1422',
        elevated: '#121b2c',
        line: '#202c40',
      },
      boxShadow: {
        panel: '0 18px 45px -30px rgb(0 0 0 / 0.85)',
      },
    },
  },
  plugins: [],
} satisfies Config;
