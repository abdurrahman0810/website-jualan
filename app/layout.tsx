import type { Metadata, Viewport } from 'next'
import '../src/index.css'
import '../src/App.css'
import '../src/storefront.css'
import { SiteFooter } from '../src/components/SiteFooter'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import { MotionProvider } from '../src/components/MotionProvider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta', display: 'swap' })

export const metadata: Metadata = {
  title: 'HEBBUNA STORE — Nyaman Jadi Dirimu',
  description: 'HEBBUNA STORE — hijab nyaman dengan pilihan warna yang menemani hari-harimu.',
  applicationName: 'HEBBUNA STORE',
}

export const viewport: Viewport = { themeColor: '#482c40' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${inter.variable} ${plusJakarta.variable}`}><MotionProvider>{children}<SiteFooter /></MotionProvider></body>
    </html>
  )
}
