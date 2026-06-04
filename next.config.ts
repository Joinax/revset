import type { NextConfig } from 'next'
 
const nextConfig: NextConfig = {
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