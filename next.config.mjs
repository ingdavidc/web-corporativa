/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // TypeScript estricto habilitado: cualquier error de tipos falla el build
  // y evita que código roto llegue a producción.
};

export default nextConfig;



