import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Background3D } from "@/components/background-3d";
import { WebContentProvider } from "@/components/web-content-provider";

// Cargamos la fuente moderna
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://dctelematica.com'), // Base URL oficial
  title: 'DC Telemática - Soluciones en Telecomunicaciones y Redes',
  description: 'Expertos en telecomunicaciones, redes, fibra óptica, infraestructura tecnológica y soluciones digitales innovadoras en Colombia.',
  keywords: ["telecomunicaciones", "redes", "fibra óptica", "infraestructura tecnológica", "ingeniería", "hospital", "Arauca", "Colombia", "sistemas", "cableado estructurado"],
  authors: [{ name: "DC Telemática" }],
  generator: 'v0.app',
  openGraph: {
    title: 'DC Telemática - Expertos en Telecomunicaciones',
    description: 'Conectamos tu futuro digital. Soluciones integrales en infraestructura tecnológica.',
    url: 'https://dctelematica.com', // Ajusta este dominio cuando lo tengas oficial
    siteName: 'DC Telemática',
    images: [
      {
        url: '/logo.png',
        width: 800,
        height: 600,
        alt: 'DC Telemática Logo',
      },
    ],
    locale: 'es_CO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DC Telemática',
    description: 'Conectamos tu futuro digital. Expertos en redes y telecomunicaciones.',
    images: ['/logo.png'],
  },
  icons: {
    icon: [
      { url: '/logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/logo.png',
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
        <WebContentProvider>
          {/* Tu fondo 3D global */}
          <Background3D />
          
          {/* El contenido de tu página */}
          {children}
        </WebContentProvider>
      </body>
    </html>
  )
}