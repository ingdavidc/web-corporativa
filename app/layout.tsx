import type { Metadata } from 'next'
import './globals.css'
import { Background3D } from "@/components/background-3d";

export const metadata: Metadata = {
  title: 'DC Telemática - Soluciones en Telecomunicaciones',
  description: 'Expertos en telecomunicaciones, redes, infraestructura tecnológica y soluciones digitales innovadoras',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="bg-background">
      <body className="font-sans antialiased">
        {/* Tu fondo 3D global */}
        <Background3D />
        
        {/* El contenido de tu página */}
        {children}
      </body>
    </html>
  )
}