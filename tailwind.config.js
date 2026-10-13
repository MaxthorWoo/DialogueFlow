/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"PingFang SC"', '"思源黑体"', '"Microsoft YaHei"', 'sans-serif'],
      },
      colors: {
        // 暗色主题
        'ink-950': '#0F1115',
        'ink-900': '#1A1D23',
        'ink-800': '#22262E',
        'ink-700': '#2C313B',
        'ink-600': '#3A404C',
        // 品牌与功能色
        brand: '#4A90D9',
        'brand-bright': '#3B82F6',
        nodeSay: '#4A90D9',
        nodeChoice: '#E8A838',
        nodeBranch: '#9B59B6',
        nodeAction: '#27AE60',
        nodeJump: '#7F8C8D',
        nodeEnd: '#E74C3C',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
