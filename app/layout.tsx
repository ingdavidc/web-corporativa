import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Background3D } from "@/components/background-3d";

// Cargamos la fuente moderna
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DC Telemática - Soluciones en Telecomunicaciones',
  description: 'Expertos en telecomunicaciones, redes, infraestructura tecnológica y soluciones digitales innovadoras',
  generator: 'v0.app',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="bg-background">
      {/* Aplicamos la fuente a todo el cuerpo de la página */}
      <body className={`${inter.className} antialiased`}>
        {/* Tu fondo 3D global */}
        <Background3D />
        
        {/* El contenido de tu página */}
        {children}
      </body>
    </html>
  )
}