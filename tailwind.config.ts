// Tailwind v4: этот файл больше не нужен для базовой настройки.
// Все токены (цвета, шрифты, брейкпоинты) живут прямо в globals.css
// через @theme { ... } — Next.js подхватит их автоматически.
//
// Файл оставлен пустым чтобы не было конфликта.
// Если понадобятся плагины — добавляй сюда.

import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: { extend: {} },
  plugins: [],
}

export default config
