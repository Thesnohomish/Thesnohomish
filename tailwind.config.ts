import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#E5D600',
          deep: '#191919',
          soft: '#F5F4F0',
          ink: '#0D0D0D',
        },
      },
      boxShadow: {
        orange: '0 18px 45px rgba(240, 90, 26, .24)',
        card: '0 12px 28px rgba(33, 20, 15, .12)',
      },
    },
  },
  plugins: [],
};

export default config;
