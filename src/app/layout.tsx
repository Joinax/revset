import type { Metadata } from 'next'
import { Unbounded, Manrope } from 'next/font/google'
import ThemeProvider from '@/components/ThemeProvider'
import SessionProvider from '@/components/SessionProvider'
import './globals.css'

const unbounded = Unbounded({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '700'],
  variable: '--font-unbounded',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'REVSET — Revit-семейства для профессионалов',
    template: '%s | REVSET',
  },
  description: 'Маркетплейс BIM-семейств (.rfa) для Autodesk Revit.',
  icons: { icon: '/revset_icon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ru"
      className={`${unbounded.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"
        />
      </head>
      <body>
        <ThemeProvider>
          <SessionProvider>
            {children}
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
