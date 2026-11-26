'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Pause, Play } from 'lucide-react';

interface HeroBackgroundVideoProps {
  src: string;
  poster: string;
}

export function HeroBackgroundVideo({ src, poster }: HeroBackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      video.pause();
      return;
    }

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Browser autoplay blocked; priority poster remains crisply visible.
      });
    }
  }, []);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    } else {
      video.pause();
    }
  };

  return (
    <>
      {/* Immediate priority poster paint while optimized MP4 streams in */}
      <Image
        src={poster}
        alt=""
        fill
        priority
        sizes="100vw"
        referrerPolicy="no-referrer"
        aria-hidden="true"
        className="object-cover object-center pointer-events-none select-none"
      />

      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className={`absolute inset-0 h-full w-full object-cover object-center pointer-events-none select-none transition-opacity duration-500 ${
          isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Measured contrast scrims so foreground typography maintains >= 4.5:1 legibility */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#0D0D0E]/90 via-[#0D0D0E]/55 to-[#0D0D0E]/45 pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-[#0D0D0E]/85 via-[#0D0D0E]/45 to-transparent pointer-events-none"
      />

      {/* Accessible ambient motion control (WCAG 2.2.2) */}
      <button
        type="button"
        onClick={togglePlayback}
        aria-label={isPlaying ? 'Pause background video' : 'Play background video'}
        className="absolute bottom-4 right-4 sm:bottom-6 sm:right-8 z-20 inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 border border-[#FAF9F6]/25 bg-[#0D0D0E]/65 backdrop-blur-sm text-[#FAF9F6] text-[11px] font-medium uppercase tracking-[0.16em] whitespace-nowrap hover:border-[#D6B46A] hover:text-[#D6B46A] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D6B46A]"
      >
        {isPlaying ? (
          <>
            <Pause className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Pause</span>
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Play</span>
          </>
        )}
      </button>
    </>
  );
}
