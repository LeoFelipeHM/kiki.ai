import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import '../styles/index.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://heykiki.com.br';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'Kiki',
  title: {
    default: 'Kiki | Menos caos, mais clareza',
    template: '%s | Kiki',
  },
  description:
    'Kiki organiza compromissos, tarefas e lembretes para deixar seu dia mais leve, claro e eficiente.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: '/',
    siteName: 'Kiki',
    title: 'Kiki | Menos caos, mais clareza',
    description:
      'Organize compromissos, tarefas e lembretes com uma assistente pessoal inteligente.',
    images: [
      {
        url: '/apple-touch-icon.png',
        width: 180,
        height: 180,
        alt: 'Kiki',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Kiki | Menos caos, mais clareza',
    description:
      'Organize compromissos, tarefas e lembretes com uma assistente pessoal inteligente.',
    images: ['/apple-touch-icon.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
