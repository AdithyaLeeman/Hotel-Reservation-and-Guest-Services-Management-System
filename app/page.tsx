'use client';

/**
 * Public Hotel Landing Page — SkyNest Hotels & Resorts
 *
 * Designed in the Royella luxury 5-star hotel editorial aesthetic.
 * All original links and features are preserved:
 * - Search Rooms (/search)
 * - Guest Register (/guest/register)
 * - Guest Login (/guest/login)
 * - Staff Portal (/staff/login)
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface RoomType {
  type_id: number;
  type_name: string;
  capacity: number;
  daily_rate: string;
}

const ROOM_METADATA: Record<string, {
  tag: string;
  subtitle: string;
  bed: string;
  image: string;
  branchId: number;
}> = {
  Single: {
    tag: 'COMFORT ROOM',
    subtitle: '500 Sq Ft / City or Garden Vista',
    bed: '1 Single Bed',
    image: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80',
    branchId: 1,
  },
  Double: {
    tag: 'DELUXE ROOM',
    subtitle: '850 Sq Ft / Up to 2 Guests',
    bed: '1 King Bed',
    image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
    branchId: 2,
  },
  Suite: {
    tag: 'LUXURY SUITE',
    subtitle: '1400 Sq Ft / Private Balcony & Lounge',
    bed: '2 King Beds',
    image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
    branchId: 3,
  },
};

const DEFAULT_ROOM_TYPES: RoomType[] = [
  { type_id: 1, type_name: 'Single', capacity: 1, daily_rate: '5000.00' },
  { type_id: 2, type_name: 'Double', capacity: 2, daily_rate: '8000.00' },
  { type_id: 3, type_name: 'Suite', capacity: 4, daily_rate: '15000.00' },
];

export default function HomePage() {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>(DEFAULT_ROOM_TYPES);

  useEffect(() => {
    fetch('/api/room-types')
      .then((res) => res.json())
      .then((payload) => {
        if (Array.isArray(payload.data) && payload.data.length > 0) {
          setRoomTypes(payload.data);
        }
      })
      .catch(() => {
        // Fall back to database defaults
      });
  }, []);

  const now = new Date();
  const checkIn = now.toISOString().slice(0, 10);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const checkOut = tomorrowDate.toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#121110] text-[#1c1917] dark:text-[#f7f5f2] antialiased selection:bg-[#c5a880]/30 selection:text-[#161514]">
      {/* ── TOP HEADER / NAVIGATION ── */}
      <header className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="container-page flex items-center justify-between h-24">
          {/* Logo with Gold Crest */}
          <Link href="/" className="flex items-center gap-3 group no-underline">
            <div className="w-10 h-10 rounded-sm bg-[#c5a880]/20 border border-[#c5a880]/60 flex items-center justify-center text-[#c5a880] shadow-sm">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-2xl tracking-[0.12em] font-semibold text-white leading-tight">
                SKYNEST
              </span>
              <span className="text-[10px] uppercase tracking-[0.26em] font-medium text-[#c5a880] leading-none">
                Hotels & Resorts
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs uppercase tracking-[0.18em] font-medium text-white/90">
            <Link href="/" className="hover:text-[#c5a880] transition-colors py-2 text-[#c5a880]">
              Home
            </Link>
            <a href="#about" className="hover:text-[#c5a880] transition-colors py-2">
              About
            </a>
            <a href="#rooms" className="hover:text-[#c5a880] transition-colors py-2">
              Rooms
            </a>
            <a href="#destinations" className="hover:text-[#c5a880] transition-colors py-2">
              Destinations
            </a>
            <Link href="/guest/login" className="hover:text-[#c5a880] transition-colors py-2">
              Guest Portal
            </Link>
            <Link href="/staff/login" className="hover:text-[#c5a880] transition-colors py-2 text-white/70">
              Staff Access
            </Link>
          </nav>

          {/* Header Action Button */}
          <div className="flex items-center gap-3">
            <Link
              href="/search"
              className="hidden sm:inline-flex items-center justify-center border border-[#c5a880] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] !text-[#c5a880] hover:bg-[#c5a880] hover:!text-[#161514] transition-all duration-300"
            >
              Booking Online
            </Link>
            <Link
              href="/guest/register"
              className="inline-flex items-center justify-center bg-[#c5a880] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] !text-[#161514] hover:bg-[#b59469] hover:!text-[#000000] transition-all duration-300 shadow-md"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-neutral-950">
        {/* Full-bleed Luxury Interior Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=2000&q=85"
            alt="SkyNest Luxury Suite Lounge"
            className="w-full h-full object-cover object-center filter brightness-[0.62] contrast-[1.05]"
          />
          {/* Subtle warm vignette and dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#141312] via-black/40 to-black/70" />
        </div>

        {/* Vertical Contact Accent (Left side matching screenshot) */}
        <div className="hidden xl:flex absolute left-8 top-1/2 -translate-y-1/2 z-10 flex-col items-center gap-6 text-white/60">
          <div className="w-[1px] h-16 bg-[#c5a880]/50" />
          <span className="[writing-mode:vertical-lr] rotate-180 text-[11px] tracking-[0.25em] font-medium uppercase text-[#c5a880]">
            +94 (11) 234-5678
          </span>
          <div className="w-[1px] h-16 bg-[#c5a880]/50" />
        </div>

        {/* Hero Content */}
        <div className="container-page relative z-10 pt-28 pb-36 text-center text-white flex flex-col items-center">
          {/* 5 Stars Rating & Tag */}
          <div className="flex flex-col items-center gap-2 mb-4 animate-fade-in">
            <div className="flex text-[#c5a880] text-sm tracking-widest" aria-label="5 Stars Luxury Rating">
              ★★★★★
            </div>
            <p className="text-xs uppercase tracking-[0.3em] font-medium text-[#c5a880]">
              LUXURY HOTEL AND RESORT
            </p>
          </div>

          {/* Main Editorial Headline */}
          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-[0.03em] max-w-5xl leading-[1.08] mb-6 drop-shadow-md">
            THE BEST LUXURY HOTEL <br className="hidden sm:block" />
            IN SRI LANKA
          </h1>

          <p className="text-white/80 text-sm sm:text-base md:text-lg max-w-2xl font-light tracking-wide mb-10">
            Colombo · Kandy · Galle Distinctive colonial heritage, beachfront serenity, and exceptional 5-star hospitality.
          </p>

          {/* Primary Call to Actions */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/search"
              className="gold-btn py-3.5 px-8 text-xs font-semibold tracking-[0.18em] shadow-lg"
            >
              Discover More
            </Link>
            <Link
              href="/guest/login"
              className="gold-btn-outline py-3.5 px-8 text-xs font-semibold tracking-[0.18em] backdrop-blur-sm"
            >
              Guest Sign In
            </Link>
          </div>
        </div>
      </section>


      {/* ── ROOMS & SUITES SECTION (Matching screenshot middle section) ── */}
      <section id="rooms" className="py-24 px-4 bg-[#faf8f5] dark:bg-[#121110]">
        <div className="max-w-7xl mx-auto">
          {/* Header with Heraldic Watermark Crest */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center justify-center w-12 h-12 mb-3 text-[#c5a880]">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <p className="text-xs uppercase tracking-[0.25em] font-semibold text-[#c5a880] mb-2">
              EXCLUSIVE LIVING SPACES
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-[#1c1917] dark:text-[#f8f6f0] tracking-tight mb-4">
              SKYNEST&apos;S ROOMS & SUITES
            </h2>
            <p className="text-[#78716c] dark:text-[#a8a29e] text-sm sm:text-base font-light leading-relaxed">
              Proactively curated luxury spaces crafted for exceptional comfort, refined relaxation, and unforgettable stays across our island properties.
            </p>
          </div>

          {/* Dynamic Database Room Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {roomTypes.map((rt) => {
              const meta = ROOM_METADATA[rt.type_name] ?? {
                tag: 'HOTEL ROOM',
                subtitle: `Capacity: ${rt.capacity} Guest${rt.capacity > 1 ? 's' : ''}`,
                bed: `${rt.capacity} Bed`,
                image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
                branchId: 1,
              };
              const formattedRate = Number(rt.daily_rate).toLocaleString('en-US');
              return (
                <article
                  key={rt.type_id}
                  className="group bg-white dark:bg-[#1a1918] border border-[#e7e2d9] dark:border-[#2f2b26] rounded-xs overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-[16/11] overflow-hidden bg-neutral-900">
                      <img
                        src={meta.image}
                        alt={`${rt.type_name} Room`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute top-3 right-3 bg-[#c5a880] text-[#161514] font-semibold text-xs tracking-wider uppercase px-3 py-1.5 shadow-md">
                        LKR {formattedRate} / NIGHT
                      </div>
                    </div>
                    <div className="p-6">
                      <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#c5a880]">
                        {meta.tag}
                      </span>
                      <h3 className="font-serif text-2xl font-medium text-[#1c1917] dark:text-[#f8f6f0] mt-1 mb-2 group-hover:text-[#c5a880] transition-colors">
                        {rt.type_name} Room
                      </h3>
                      <p className="text-xs text-[#78716c] dark:text-[#a8a29e] mb-4">
                        {meta.subtitle}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-[#f0ece5] dark:border-[#2b2723] text-xs text-[#78716c] dark:text-[#a8a29e]">
                        <div className="flex items-center gap-1.5">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-[#c5a880]">
                            <path d="M3 7v10M21 7v10M3 12h18M5 7h14a2 2 0 0 1 2 2v1H3V9a2 2 0 0 1 2-2z" />
                          </svg>
                          <span>{meta.bed}</span>
                        </div>
                        <div className="flex text-[#c5a880] text-xs">★★★★★</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 pt-0">
                    <Link
                      href={`/search?branchId=${meta.branchId}&roomTypeId=${rt.type_id}&checkIn=${checkIn}&checkOut=${checkOut}`}
                      className="block w-full text-center py-2.5 bg-[#c5a880] hover:bg-[#b59469] !text-[#161514] hover:!text-[#000000] text-xs font-semibold uppercase tracking-[0.16em] transition-colors"
                    >
                      Check Availability
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination Indicators (matching screenshot dot indicator) */}
          <div className="flex items-center justify-center gap-2">
            <span className="w-8 h-2 rounded-full bg-[#c5a880]" />
            <span className="w-2 h-2 rounded-full bg-[#c5a880]/30" />
            <span className="w-2 h-2 rounded-full bg-[#c5a880]/30" />
          </div>
        </div>
      </section>

      {/* ── SPLIT STORY / ABOUT SECTION (Matching screenshot lower section) ── */}
      <section id="about" className="py-24 px-4 bg-white dark:bg-[#151413] border-t border-[#e7e2d9] dark:border-[#2f2b26]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left: Layered Photography with Gold Frame & Laurel Crest Badge */}
          <div className="lg:col-span-6 relative">
            {/* Background Decorative Gold Accent Frame */}
            <div className="absolute -top-4 -left-4 w-3/4 h-3/4 border-2 border-[#c5a880] -z-0 opacity-70" />

            {/* Main Image */}
            <div className="relative z-10 overflow-hidden shadow-2xl rounded-xs">
              <img
                src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=85"
                alt="SkyNest Hotel Architecture and Interior"
                className="w-full h-auto object-cover max-h-[520px]"
              />
            </div>

            {/* Overlaid Gold Laurel Crest Badge (matching reference) */}
            <div className="absolute top-6 right-6 z-20 bg-[#161514]/90 border border-[#c5a880] p-4 text-center text-[#c5a880] backdrop-blur-md shadow-xl">
              <div className="flex justify-center mb-1 text-sm">★★★★★</div>
              <p className="font-serif text-sm font-semibold tracking-wider text-white">WORLD LUXURY</p>
              <p className="text-[9px] uppercase tracking-[0.2em] text-[#c5a880]">Hotel Award Winner</p>
            </div>
          </div>

          {/* Right: Editorial Story & Key Metrics */}
          <div className="lg:col-span-6 space-y-6">
            <p className="text-xs uppercase tracking-[0.26em] font-semibold text-[#c5a880]">
              LUXURY HOTEL AND RESORT
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-[#1c1917] dark:text-[#f8f6f0] leading-[1.15]">
              LUXURY BEST HOTEL IN SRI LANKA, COLOMBO &amp; GALLE
            </h2>
            <p className="text-[#78716c] dark:text-[#a8a29e] text-sm sm:text-base font-light leading-relaxed">
              Experience unparalleled refinement where serene Indian Ocean shores meet lush central highlands. At SkyNest, each property is thoughtfully designed to blend Sri Lanka&apos;s rich cultural heritage with world-class personalized guest service.
            </p>
            <p className="text-[#78716c] dark:text-[#a8a29e] text-sm font-light leading-relaxed">
              Whether relaxing by our private oceanfront suites or indulging in bespoke wellness therapies, enjoy seamless reservation management, instant billing transparency, and concierge care.
            </p>

            {/* Metrics Counters */}
            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-[#f0ece5] dark:border-[#2f2b26]">
              <div>
                <p className="font-serif text-4xl sm:text-5xl font-normal text-[#1c1917] dark:text-[#f8f6f0]">
                  250<span className="text-[#c5a880]">+</span>
                </p>
                <p className="text-xs uppercase tracking-[0.16em] text-[#78716c] dark:text-[#a8a29e] mt-1">
                  Luxury Rooms &amp; Suites
                </p>
              </div>
              <div>
                <p className="font-serif text-4xl sm:text-5xl font-normal text-[#1c1917] dark:text-[#f8f6f0]">
                  4.9
                </p>
                <p className="text-xs uppercase tracking-[0.16em] text-[#78716c] dark:text-[#a8a29e] mt-1 flex items-center gap-1">
                  <span>Guest Satisfaction</span>
                  <span className="text-[#c5a880]">★★★★★</span>
                </p>
              </div>
            </div>

            {/* Discover More CTA Button */}
            <div className="pt-4">
              <Link
                href="/search"
                className="gold-btn py-3.5 px-8 text-xs font-semibold tracking-[0.18em]"
              >
                Discover More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── DESTINATIONS SHOWCASE (Colombo, Kandy, Galle) ── */}
      <section id="destinations" className="py-20 px-4 bg-[#f6f3ed] dark:bg-[#121110]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-xs uppercase tracking-[0.22em] font-semibold text-[#c5a880] mb-2">
              OUR ISLAND PROPERTIES
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#1c1917] dark:text-[#f8f6f0]">
              Discover Our Destinations
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Colombo */}
            <div className="relative group overflow-hidden rounded-xs h-80 shadow-md">
              <img
                src="https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80"
                alt="Colombo City Property"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-6 flex flex-col justify-end text-white">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#c5a880]">Urban Luxury</span>
                <h3 className="font-serif text-2xl font-normal">Colombo SkyNest</h3>
                <p className="text-xs text-white/75 mt-1 font-light">Commercial capital elegance &amp; rooftop ocean views.</p>
                <Link
                  href={`/search?branchId=1&checkIn=${checkIn}&checkOut=${checkOut}`}
                  className="mt-4 text-xs uppercase tracking-[0.15em] text-[#c5a880] font-semibold hover:underline inline-flex items-center gap-1"
                >
                  Explore Rooms →
                </Link>
              </div>
            </div>

            {/* Kandy */}
            <div className="relative group overflow-hidden rounded-xs h-80 shadow-md">
              <img
                src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80"
                alt="Kandy Hill Resort"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-6 flex flex-col justify-end text-white">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#c5a880]">Mountain Retreat</span>
                <h3 className="font-serif text-2xl font-normal">Kandy Hill Haven</h3>
                <p className="text-xs text-white/75 mt-1 font-light">Mist-shrouded peaks, tea valleys &amp; sacred serenity.</p>
                <Link
                  href={`/search?branchId=2&checkIn=${checkIn}&checkOut=${checkOut}`}
                  className="mt-4 text-xs uppercase tracking-[0.15em] text-[#c5a880] font-semibold hover:underline inline-flex items-center gap-1"
                >
                  Explore Rooms →
                </Link>
              </div>
            </div>

            {/* Galle */}
            <div className="relative group overflow-hidden rounded-xs h-80 shadow-md">
              <img
                src="https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80"
                alt="Galle Coastal Sanctuary"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-6 flex flex-col justify-end text-white">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#c5a880]">Coastal Sanctuary</span>
                <h3 className="font-serif text-2xl font-normal">Galle Ocean Villas</h3>
                <p className="text-xs text-white/75 mt-1 font-light">Colonial fortress charm &amp; turquoise seaside relaxation.</p>
                <Link
                  href={`/search?branchId=3&checkIn=${checkIn}&checkOut=${checkOut}`}
                  className="mt-4 text-xs uppercase tracking-[0.15em] text-[#c5a880] font-semibold hover:underline inline-flex items-center gap-1"
                >
                  Explore Rooms →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LUXURY FOOTER (Deep Charcoal & Gold Crest) ── */}
      <footer className="bg-[#141312] text-white pt-20 pb-12 border-t border-[#2e2a24]">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-16 border-b border-[#2e2a24]">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-sm bg-[#c5a880]/20 border border-[#c5a880]/60 flex items-center justify-center text-[#c5a880]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <span className="font-serif text-2xl tracking-[0.1em] font-semibold text-white">
                SKYNEST
              </span>
            </div>
            <p className="text-xs text-white/60 font-light leading-relaxed max-w-sm">
              SkyNest Hotels &amp; Resorts is Sri Lanka&apos;s distinguished hospitality group, offering authentic 5-star experiences across Colombo, Kandy, and Galle.
            </p>
            <div className="flex text-[#c5a880] text-sm pt-1">★★★★★ Luxury Heritage</div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#c5a880]">
              Quick Links
            </p>
            <ul className="space-y-2 text-xs text-white/75 font-light">
              <li>
                <Link href="/search" className="hover:text-[#c5a880] transition-colors">
                  Search Availability
                </Link>
              </li>
              <li>
                <Link href="/guest/login" className="hover:text-[#c5a880] transition-colors">
                  Guest Sign In
                </Link>
              </li>
              <li>
                <Link href="/guest/register" className="hover:text-[#c5a880] transition-colors">
                  New Guest Registration
                </Link>
              </li>
              <li>
                <Link href="/guest/reservations" className="hover:text-[#c5a880] transition-colors">
                  My Reservations
                </Link>
              </li>
            </ul>
          </div>

          {/* Branches */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#c5a880]">
              Destinations
            </p>
            <ul className="space-y-2 text-xs text-white/75 font-light">
              <li>Colombo - Galle Face Marine Drive</li>
              <li>Kandy - Hanthana Ridge Sanctuary</li>
              <li>Galle - Light House Fort Promenade</li>
            </ul>
          </div>

          {/* Staff & Admin Access */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#c5a880]">
              Staff &amp; Operations
            </p>
            <ul className="space-y-2 text-xs text-white/75 font-light">
              <li>
                <Link href="/staff/login" className="hover:text-[#c5a880] transition-colors flex items-center gap-1">
                  <span>Staff Portal</span>
                  <span>→</span>
                </Link>
              </li>
              <li className="text-white/40 text-[11px] pt-1">
                Receptionist · Manager · Admin Portal
              </li>
            </ul>
          </div>
        </div>

        {/* Academic Attribution & Copyright */}
        <div className="max-w-7xl mx-auto px-4 pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-white/50 gap-4">
          <p>© {new Date().getFullYear()} SkyNest Hotels Group. All rights reserved.</p>
          <p className="text-white/60">
            University of Moratuwa - Database Systems Project - Group 39 HRGSMS
          </p>
        </div>
      </footer>
    </div>
  );
}
