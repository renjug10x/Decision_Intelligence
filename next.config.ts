import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Next.js 16 uses Turbopack by default — no webpack config needed
  turbopack: {},
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
};

export default nextConfig;
