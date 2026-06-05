import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import '../styles/index.css';
import { defaultOgImage, siteUrl } from './public-site/seo';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'Kiki',
  title: {
    default: 'Kiki | Assistente pessoal com IA para organizar sua rotina',
    template: '%s | Kiki',
  },
  description:
    'Kiki é uma assistente pessoal com IA que organiza agenda, tarefas, lembretes, notas e agentes autônomos para deixar sua rotina mais clara.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: '/',
    siteName: 'Kiki',
    title: 'Kiki | Assistente pessoal com IA para organizar sua rotina',
    description:
      'Organize compromissos, tarefas, lembretes e notas com uma assistente pessoal inteligente.',
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: 'Kiki - assistente pessoal com IA para organizar sua rotina',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kiki | Assistente pessoal com IA para organizar sua rotina',
    description:
      'Organize compromissos, tarefas e lembretes com uma assistente pessoal inteligente.',
    images: [defaultOgImage],
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
