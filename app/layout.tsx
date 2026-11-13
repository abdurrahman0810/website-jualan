import type { Metadata, Viewport } from 'next'
import '../src/index.css'
import { SiteFooter } from '../src/components/SiteFooter'
import { Plus_Jakarta_Sans, Cormorant_Garamond } from 'next/font/google'
import { MotionProvider } from '../src/components/MotionProvider'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'HEBBUNA STORE — Modern Modest Wear',
  description: 'HEBBUNA STORE — busana modest modern dengan siluet elegan dan kenyamanan esensial.',
  applicationName: 'HEBBUNA STORE',
}

export const viewport: Viewport = {
  themeColor: '#FCFBF8',
  colorScheme: 'light',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${plusJakarta.variable} ${cormorant.variable}`}>
      <body className="bg-[#FCFBF8] text-[#24201D] font-sans antialiased selection:bg-[#F5EDE2] selection:text-[#24201D]">
        <MotionProvider>
          {children}
          <SiteFooter />
        </MotionProvider>
      </body>
    </html>
  )
}
