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
        // 底层灰阶（随主题切换，变量定义见 index.css）
        'ink-950': 'rgb(var(--nf-ink-950) / <alpha-value>)',
        'ink-900': 'rgb(var(--nf-ink-900) / <alpha-value>)',
        'ink-800': 'rgb(var(--nf-ink-800) / <alpha-value>)',
        'ink-700': 'rgb(var(--nf-ink-700) / <alpha-value>)',
        'ink-600': 'rgb(var(--nf-ink-600) / <alpha-value>)',
        gray: {
          100: 'rgb(var(--nf-gray-100) / <alpha-value>)',
          200: 'rgb(var(--nf-gray-200) / <alpha-value>)',
          300: 'rgb(var(--nf-gray-300) / <alpha-value>)',
          400: 'rgb(var(--nf-gray-400) / <alpha-value>)',
          500: 'rgb(var(--nf-gray-500) / <alpha-value>)',
          600: 'rgb(var(--nf-gray-600) / <alpha-value>)',
        },
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
