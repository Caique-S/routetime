import { NextConfig } from "next"

const nextConfig : NextConfig = {

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp'
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin'
          },
          // Permitir acesso à câmera
          {
            key: 'Permissions-Policy',
            value: 'camera=(self)'
          }
        ]
      }
    ]
  },
  reactCompiler: true,
    
    serverExternalPackages: [],

    typescript: {
    ignoreBuildErrors: true, // Temporário para debug
  },
}

export default nextConfig