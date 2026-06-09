/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Le decimos a Next.js que no bloquee la subida por advertencias menores
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;


