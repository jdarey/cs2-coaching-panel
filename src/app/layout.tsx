import type { Metadata } from 'next'
import { Lexend_Deca } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

// Vantor template typography: Lexend Deca everywhere (400-700, latin-ext for Polish)
// JEDEN import fontu = ~2x mniej woff2 do pobrania (~100-200KB oszczędności na cold load).
// display:swap zapobiega FOIT, preload tylko dla pierwszego widoku.
const lexend = Lexend_Deca({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
  preload: true,
})
// display używa tego samego pliku fontu co sans — alias CSS bez drugiego pobierania.
const lexendDisplay = lexend

export const metadata: Metadata = {
  title: {
    default: 'CS2 Coaching Panel',
    template: '%s • CS2 Coaching',
  },
  description: 'Panel do zarządzania treningiem CS2 - tagi, filmy, sesje, postęp',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className={`${lexend.variable} ${lexendDisplay.variable} font-sans antialiased`}>
        {/* Cinematic film grain over the whole app (pointer-transparent) */}
        <div className="grain" aria-hidden />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
