import type { Metadata, Viewport } from 'next';
import { Inter, Lato, JetBrains_Mono, Cormorant_Garamond } from 'next/font/google';
import Script from 'next/script';

import './globals.css';

/* ─── Burj Khalifa Typography: Inter (Headings & UI) + Lato (Body & Copy) ─── */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800'],
});

const lato = Lato({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lato',
  weight: ['100', '300', '400', '700', '900'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500'],
});

/* ─── Heritage Luxury Serif: Cormorant Garamond ─── */
const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-cormorant',
  weight: ['300', '400', '500', '600', '700'],
});

/* ─── Metadata ──────────────────────────────────────────────────────────────── */

export const metadata: Metadata = {

  title: {
    template: '%s - SkyNest Hotels',
    default: 'SkyNest Hotels | Book Your Perfect Stay',
  },
  description:
    'SkyNest Hotels - Discover comfort and elegance at our Colombo, Kandy, and Galle properties. Reserve your room online in minutes.',
  keywords: [
    'hotel',
    'Sri Lanka',
    'Colombo hotel',
    'Kandy hotel',
    'Galle hotel',
    'room booking',
    'SkyNest',
  ],
  authors: [{ name: 'SkyNest Hotels Group 39' }],

  openGraph: {
    type: 'website',
    siteName: 'SkyNest Hotels',
    title: 'SkyNest Hotels | Book Your Perfect Stay',
    description:
      'Discover comfort and elegance at SkyNest Hotels in Colombo, Kandy, and Galle. Reserve online instantly.',
    locale: 'en_LK',
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'hsl(196 80% 30%)' },
    { media: '(prefers-color-scheme: dark)', color: 'hsl(215 28% 8%)' },
  ],
};

/* ─── Root Layout ───────────────────────────────────────────────────────────── */

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (

    <html
      lang="en"
      className={`${inter.variable} ${lato.variable} ${jetbrainsMono.variable} ${cormorantGaramond.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@100;200;300;400;500;600;700;800&family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700&display=swap"
          rel="stylesheet"
        />
        {/*
         * Theme initialization - runs before paint to prevent FOUC.
         * Reads localStorage['skynest-theme'] and sets data-theme on <html>.
         * This is intentionally inline and does not depend on any bundle.
         *
         * Allowed values: 'dark' | 'light' (anything else → system default).
         */}
        <Script
          id="skynest-theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    var t = localStorage.getItem('skynest-theme');
    if (t === 'dark' || t === 'light') {
      document.documentElement.setAttribute('data-theme', t);
    }
  } catch(e) {}
})();
            `.trim(),
          }}
        />
      </head>
      <body className="min-h-dvh flex flex-col antialiased">
        {/*
         * children is the page or nested layout rendered by Next.js.
         * Navigation (GuestNav / StaffNav) is injected by segment layouts,
         * not here - this keeps the root layout free of auth coupling.
         */}
        {children}

        {/*
         * No-JS graceful degradation: if JS is disabled, the theme script
         * above never runs and the page falls back to OS preference via CSS.
         * Nothing extra needed here.
         */}
      </body>
    </html>
  );
}

