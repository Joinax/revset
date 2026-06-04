import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'pg', '@prisma/adapter-pg'],
  turbopack: {
    resolveAlias: {
      '@prisma/client': '@prisma/client',
    },
  },
}

export default nextConfig
