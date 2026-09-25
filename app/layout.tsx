import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';


const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});


const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500'],
});

/* ─── Metadata ──────────────────────────────────────────────────────────────── */

export const metadata: Metadata = {

  title: {
    template: '%s — SkyNest Hotels',
    default: 'SkyNest Hotels | Book Your Perfect Stay',
  },
  description:
    'SkyNest Hotels — Discover comfort and elegance at our Colombo, Kandy, and Galle properties. Reserve your room online in minutes.',
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
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/*
         * Theme initialization — runs before paint to prevent FOUC.
         * Reads localStorage['skynest-theme'] and sets data-theme on <html>.
         * This is intentionally inline and does not depend on any bundle.
         *
         * Allowed values: 'dark' | 'light' (anything else → system default).
         */}
        <script
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
         * not here — this keeps the root layout free of auth coupling.
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

