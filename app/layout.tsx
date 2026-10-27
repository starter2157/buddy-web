import type { Metadata, Viewport } from 'next';
import { Fredoka, Mitr, IBM_Plex_Sans_Thai } from 'next/font/google';
import './globals.css';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-fredoka',
  display: 'swap',
});

const mitr = Mitr({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mitr',
  display: 'swap',
});

const plexThai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-thai',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '3 Sanjorn Sonsamphan — Buddy–Budder',
  description: 'กิจกรรมบัดดี้–บัดเดอร์ ค่าย 3 สานจอร์นสานสัมพันธ์',
};

export const viewport: Viewport = {
  themeColor: '#D6ECF5',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${fredoka.variable} ${mitr.variable} ${plexThai.variable}`}>
      <body>{children}</body>
    </html>
  );
}
