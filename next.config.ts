import type { NextConfig } from 'next'
 
const nextConfig: NextConfig = {
  // .localhost в dev-режиме у Next.js иногда схлопывается до простого
  // localhost без поддомена — используем зарезервированную тестовую зону .test
  allowedDevOrigins: ['admin.revset.test:3000', 'revset.test:3000'],

  serverExternalPackages: [
    '@prisma/client',
    '@prisma/adapter-pg',
    'pg',
    'better-auth',
  ],
  turbopack: {
    resolveAlias: {
      '@prisma/client':  '@prisma/client',
      'react':           'react',
      'react-dom':       'react-dom',
      'better-auth/react': 'better-auth/react',
    },
  },
}
 
export default nextConfig