import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@google/genai'],
  // Expose auth base URL to the client bundle (fallback when runtime meta tag is absent).
  env: {
    AUTH_API_URL: process.env.AUTH_API_URL ?? '',
    NEXT_PUBLIC_AUTH_API_URL:
      process.env.NEXT_PUBLIC_AUTH_API_URL ?? process.env.AUTH_API_URL ?? '',
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
