import type { Metadata } from 'next'
import { Lexend_Deca } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

// Vantor template typography: Lexend Deca everywhere (400-700, latin-ext for Polish)
const lexend = Lexend_Deca({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
})
const lexendDisplay = Lexend_Deca({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'CS2 Coaching Panel',
  description: 'Panel do zarządzania treningiem CS2 - tagi, filmy, sesje, postęp',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className={`${lexend.variable} ${lexendDisplay.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
