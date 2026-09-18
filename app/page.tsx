import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SkyNest Hotels — Premium Hotel Reservations',
  description:
    'Book your stay at SkyNest Hotels across Colombo, Kandy, and Galle. ' +
    'Modern comfort, exceptional service.',
};

/**
 * Public hotel landing page.
 *
 * Owned by: Member 1 (M1) | Full implementation in: P01-M01-T23 / P01-M01-T29
 *
 * This is a minimal placeholder that links to the search and auth entry points.
 * The full branded landing page is built in SP1.4.
 *
 * See UI- ref/index.html for the full design reference.
 */
export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-8">
      <div className="text-center max-w-2xl">
        <p className="text-sm font-semibold tracking-widest text-amber-400 uppercase mb-4">
          SkyNest Hotels — Group 39 HRGSMS
        </p>
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          Your perfect stay starts here
        </h1>
        <p className="text-zinc-400 text-lg mb-12">
          Colombo · Kandy · Galle
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/search"
            className="px-8 py-3 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-colors"
          >
            Search Rooms
          </Link>
          <Link
            href="/guest/register"
            className="px-8 py-3 rounded-lg border border-zinc-600 text-white font-semibold hover:bg-zinc-800 transition-colors"
          >
            Register
          </Link>
          <Link
            href="/guest/login"
            className="px-8 py-3 rounded-lg border border-zinc-600 text-white font-semibold hover:bg-zinc-800 transition-colors"
          >
            Guest Login
          </Link>
          <Link
            href="/staff/login"
            className="px-8 py-3 rounded-lg border border-zinc-700 text-zinc-400 font-semibold hover:bg-zinc-900 transition-colors"
          >
            Staff Portal →
          </Link>
        </div>
        <p className="mt-16 text-xs text-zinc-600">
          University of Moratuwa — Database Systems Project — Group 39
        </p>
      </div>
    </main>
  );
}
