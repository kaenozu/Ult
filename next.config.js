/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ]
  },

  // Force webpack for compatibility
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle splitting
    if (!dev && !isServer) {
      config.optimization.splitChunks.chunks = 'all';
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        // Separate vendor chunks
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        // Separate React-related chunks
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|@react-three)[\\/]/,
          name: 'react',
          chunks: 'all',
          priority: 20,
        },
        // Separate UI library chunks
        ui: {
          test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|tailwindcss)[\\/]/,
          name: 'ui',
          chunks: 'all',
          priority: 15,
        },
      };
    }

    // Add compression for production (requires compression-webpack-plugin)
    // if (!dev && !isServer) {
    //   config.plugins.push(
    //     new (require('compression-webpack-plugin'))({
    //       algorithm: 'gzip',
    //       test: /\.(js|css|html|svg)$/,
    //       threshold: 10240,
    //       minRatio: 0.8,
    //     })
    //   );
    // }

    return config;
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400, // 24 hours
  },

  // Compression
  compress: true,

  // Headers for performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // PWA and service worker (if needed)
  // Note: Service worker configuration moved to separate plugin

  // Build optimization
  output: 'standalone',
  poweredByHeader: false,

  // Environment variables
  env: {
    BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
