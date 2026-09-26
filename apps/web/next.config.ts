import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@judge-chess/shared'],
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(mp3|wav|ogg)$/,
      type: 'asset/resource'
    });
    return config;
  },
  async rewrites() {
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://127.0.0.1:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${serverUrl}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
