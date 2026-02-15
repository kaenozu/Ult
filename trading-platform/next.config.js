const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack設定
  turbopack: {
    root: __dirname,
  },
  
  // 画像最適化
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.githubusercontent.com',
      },
    ],
  },
  
  // 実験的機能
  experimental: {
    // 改善されたtree shaking
    optimizePackageImports: [
      'lucide-react',
      '@tanstack/react-query',
      'date-fns',
      'recharts',
    ],
    // パーシャルプリレンダリング（Pages Routerでは使用不可）
    // ppr: true,
  },
  
  // 圧縮
  compress: true,
  
  // パワードBYヘッダーを削除
  poweredByHeader: false,
  
  // 生成時のエラーを無視（開発時のみ）
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // リダイレクトとヘッダー
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },
  
  // ウェブパック設定（カスタムが必要な場合）
  webpack: (config, { isServer }) => {
    // 大きなライブラリを分割
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          // TensorFlow.jsを別チャンクに
          tensorflow: {
            test: /[\\/]node_modules[\\/]@tensorflow[\\/]/,
            name: 'tensorflow',
            chunks: 'all',
            priority: 10,
          },
          // チャートライブラリを別チャンクに
          charts: {
            test: /[\\/]node_modules[\\/](chart\.js|recharts)[\\/]/,
            name: 'charts',
            chunks: 'all',
            priority: 10,
          },
        },
      };
    }
    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);
