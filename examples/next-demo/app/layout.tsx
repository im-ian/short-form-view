import './globals.css'

export const metadata = {
  title: 'short-form-view — demo',
  description: 'Instagram/TikTok-style vertical swipe pager for React.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
