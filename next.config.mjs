/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['localhost'],
  },
  reactStrictMode: true,
  // Enable dynamic rendering
  output: 'standalone',
  experimental: {
    // Enable server actions
    serverActions: {},
  },
  serverExternalPackages: ['cookies'],
  // Configure dynamic routes
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ]
  },
  // Mark admin routes as dynamic
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/admin/:path*',
          destination: '/admin/:path*',
          has: [
            {
              type: 'cookie',
              key: 'supabase-auth-token',
            },
          ],
        },
      ],
    }
  },
  env: {
    NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  // Optimize webpack config
  webpack: (config, { isServer }) => {
    // Optimize chunks
    config.optimization = {
      ...config.optimization,
      runtimeChunk: 'single',
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: Infinity,
        minSize: 0,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              const match = module.context && module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/);
              if (match && match[1]) {
                return `vendor.${match[1].replace('@', '')}`;
              }
              return 'vendor';
            },
          },
        },
      },
    }
    return config
  },
}

export default nextConfig
