import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import './globals.css'
import { RootLayoutClient } from './RootLayoutClient'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'iPrintRush - Same-Day Printing Services',
  description: 'Fast, professional same-day printing solutions. Order before 2 PM for same-day completion.',
  generator: 'v0.app',
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "iPrintRush",
  "url": "https://iprintrush.com",
  "logo": "https://iprintrush.com/logo.png",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased">
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  )
}
