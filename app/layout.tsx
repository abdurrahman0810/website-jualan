import type { Metadata, Viewport } from 'next'
import '../src/index.css'
import '../src/App.css'
import '../src/storefront.css'

export const metadata: Metadata = {
  title: 'HEBBUNA STORE — Nyaman Jadi Dirimu',
  description: 'HEBBUNA STORE — hijab nyaman dengan pilihan warna yang menemani hari-harimu.',
  applicationName: 'HEBBUNA STORE',
}

export const viewport: Viewport = { themeColor: '#482c40' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
