import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'CogniX — G10X Enterprise Innovation Lab',
  description: 'Prototyping, validating, and accelerating emerging enterprise intelligence concepts.',
  icons: { icon: '/favicon.ico' },
};

/** Read container `AUTH_API_URL` at request time (not at image build time). */
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const authApiUrl = (process.env.AUTH_API_URL ?? process.env.NEXT_PUBLIC_AUTH_API_URL ?? '').replace(
    /\/+$/,
    ''
  );

  return (
    <html lang="en">
      <head>
        {authApiUrl ? <meta name="auth-api-url" content={authApiUrl} /> : null}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
