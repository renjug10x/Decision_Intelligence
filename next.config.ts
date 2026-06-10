import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Expose AUTH_API_URL to the client bundle (used by auth Axios client).
  env: {
    AUTH_API_URL: process.env.AUTH_API_URL ?? '',
  },
  // Next.js 16 uses Turbopack by default — no webpack config needed
  turbopack: {},
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
};

export default nextConfig;
