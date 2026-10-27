import type { Config } from 'tailwindcss';

/**
 * Design tokens for "3 Sanjorn Sonsamphan" — taken from the approved mockups
 * in ../design/*.dc.html. Nothing in the app hardcodes a hex value; every
 * colour, radius and shadow used by a component comes from here.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ground: '#FBF6E9',
        card: '#FFFFFF',
        ink: '#3A2A1B',
        muted: '#6B5B48',
        border: '#E2D6BC',
        'border-soft': '#EFE6D2',
        sky: '#D6ECF5',
        grass: '#A9CF6A',
        wood: '#9A6A3E',
        'wood-dark': '#6E4523',
        // The two lighter woods of the hero signboard and its post.
        'wood-sign': '#A9733F',
        'wood-post': '#8A5A33',
        brown: '#7A4E2A',
        primary: '#C7461F',
        'primary-pressed': '#8E2F12',
        'primary-stroke': '#7A2A10',
        link: '#A33A18',
        'link-hover': '#7A2A10',
        required: '#D32F2F',
        locked: '#F3EDE0',
        sketch: '#CDBF9F',
        'table-head': '#F6F0E2',
        logo: {
          stroke: '#9A8F6E',
          orange: '#C7461F',
          lime: '#C9DC5A',
          'lime-stroke': '#5C6E14',
        },
        pharmacy: {
          DEFAULT: '#3F7A1E',
          soft: '#E3EFD2',
          text: '#3F7A1E',
          'soft-text': '#2F5E16',
          pressed: '#2A5612',
        },
        science: {
          DEFAULT: '#F2C12E',
          soft: '#FCEFC2',
          text: '#7A5C00',
        },
        engineering: {
          DEFAULT: '#A3302A',
          soft: '#F6DCD6',
          text: '#A3302A',
        },
      },
      fontFamily: {
        // next/font injects these CSS variables in app/layout.tsx.
        logo: ['var(--font-fredoka)', 'sans-serif'],
        heading: ['var(--font-mitr)', 'sans-serif'],
        sans: ['var(--font-plex-thai)', 'sans-serif'],
      },
      borderRadius: {
        input: '12px',
        btn: '16px',
        card: '18px',
        'card-lg': '20px',
        'card-xl': '24px',
      },
      boxShadow: {
        card: '0 2px 0 #E8DEC6',
        'card-raised': '0 3px 0 #E2D6BC',
        'card-deep': '0 4px 0 #E2D6BC',
        btn: '0 4px 0 #8E2F12',
        'btn-green': '0 4px 0 #2A5612',
      },
      minHeight: {
        // 44px is the minimum touch target used throughout the designs.
        touch: '44px',
        field: '48px',
        action: '54px',
      },
      maxWidth: {
        // The mobile column is 390px wide and centred on desktop.
        mobile: '480px',
        admin: '1280px',
      },
    },
  },
  plugins: [],
};

export default config;
