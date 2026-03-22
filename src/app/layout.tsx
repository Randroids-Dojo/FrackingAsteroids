import type { Metadata, Viewport } from 'next'
import './globals.css'
import { UpdateBanner } from '@/components/UpdateBanner'

export const metadata: Metadata = {
  title: 'FrackingAsteroids',
  description: 'Blast asteroids, collect fragments, scrap resources, upgrade your ship.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <UpdateBanner />
        {children}
      </body>
    </html>
  )
}
