/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#F0F7F4',
          100: '#D8F3DC',
          200: '#B7E4C7',
          300: '#95D5B2',
          400: '#74C69D',
          500: '#52B788',
          600: '#40916C',
          700: '#2D6A4F', // Core secondary forest
          800: '#1B4332', // Core primary forest
          900: '#081C15',
          950: '#040E0A',
        },
        cream: {
          50: '#FAF8F5',  // Background warm-white
          100: '#F5EFEB', // Secondary cream surface
          200: '#EDE4DC',
          300: '#E1D3C5',
          400: '#D2BDAA',
        },
        amberGold: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706', // Primary restrained orange highlight
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        stoneGray: {
          50: '#FAFAF9',
          100: '#F5F5F4',
          200: '#E7E5E4',
          300: '#D6D3D1',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'soft-sm': '0 1px 3px rgba(27, 67, 50, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
        'soft': '0 4px 20px -2px rgba(27, 67, 50, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
        'soft-lg': '0 10px 30px -4px rgba(27, 67, 50, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        'soft-xl': '0 20px 40px -6px rgba(27, 67, 50, 0.12), 0 8px 16px -4px rgba(0, 0, 0, 0.06)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      }
    },
  },
  plugins: [],
}
