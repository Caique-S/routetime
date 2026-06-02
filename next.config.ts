import { NextConfig } from "next"

const nextConfig : NextConfig = {

  allowedDevOrigins: ['10.55.207.19', '10.55.207.19:3000', '10.223.146.17', '10.223.146.17:3000'],

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