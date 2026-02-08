import { NextConfig } from "next"

const nextConfig : NextConfig = {
  reactCompiler: true,
    
    serverExternalPackages: [],

    typescript: {
    ignoreBuildErrors: true, // Temporário para debug
  },
}

export default nextConfig