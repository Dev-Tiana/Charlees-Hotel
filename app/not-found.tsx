import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#171614] flex flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822] mb-4">
        Page Not Found
      </p>
      <h1 className="font-display text-5xl sm:text-6xl font-normal tracking-tight text-[#171614] max-w-xl text-balance mb-6">
        This page could not be located at Charlees Hotel &amp; Suites
      </h1>
      <p className="text-base text-[#5C574F] max-w-md mb-10 leading-relaxed">
        The address you requested may have moved or is no longer active. Return to the main property overview or inspect available rooms in Abraka.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-[#0D0D0E] text-[#FAF9F6] px-6 py-3 text-sm font-medium tracking-wide hover:bg-[#24221F] transition-colors"
        >
          <span>Return Home</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/rooms"
          className="inline-flex items-center gap-2 border border-[#D8D1C5] px-6 py-3 text-sm font-medium text-[#171614] hover:border-[#8C6822] transition-colors"
        >
          <span>View Rooms</span>
        </Link>
      </div>
    </main>
  );
}
