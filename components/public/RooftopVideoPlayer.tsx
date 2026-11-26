'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useReducedMotion } from 'motion/react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { MediaAsset } from '@/lib/types';

interface RooftopVideoPlayerProps {
  asset?: MediaAsset | null;
  title?: string;
  tone?: 'light' | 'dark';
  maxWidthClass?: string;
}

const DEFAULT_ROOFTOP_VIDEO_SRC = '/media/rooftop/charlees-rooftop-tour.mp4';
const DEFAULT_ROOFTOP_POSTER_SRC = '/media/rooftop/charlees-rooftop-poster.jpg';

export function RooftopVideoPlayer({
  asset,
  title = 'The Rooftop Lounge',
  tone = 'dark',
  maxWidthClass = 'max-w-[390px]',
}: RooftopVideoPlayerProps) {
  const isDark = tone === 'dark';
  const shouldReduce = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const videoSrc =
    asset?.media_type === 'video' && asset.public_url
      ? asset.public_url
      : DEFAULT_ROOFTOP_VIDEO_SRC;
  const posterSrc = asset?.poster_url || DEFAULT_ROOFTOP_POSTER_SRC;
  const altText =
    asset?.alt_text ||
    'Video walkthrough of the Rooftop Bar and Lounge at Charlees Hotel and Suites in Abraka, featuring sunlit skylights, lounge seating, and the bar counter.';

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = isMuted;

    if (shouldReduce) {
      video.pause();
      return;
    }

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Poster remains visible if browser autoplay is blocked
      });
    }
  }, [shouldReduce, isMuted]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (video) {
      video.muted = nextMuted;
    }
  };

  return (
    <div className={`w-full ${maxWidthClass} mx-auto`}>
      <div
        className={`relative aspect-[9/16] w-full overflow-hidden border bg-[#0D0D0E] ${
          isDark ? 'border-[#2C2822]' : 'border-[#E6E1D8]'
        }`}
      >
        <Image
          src={posterSrc}
          alt={altText}
          fill
          sizes="(max-width: 768px) 100vw, 390px"
          referrerPolicy="no-referrer"
          className="object-cover object-center pointer-events-none select-none"
        />

        <video
          ref={videoRef}
          src={videoSrc}
          poster={posterSrc}
          autoPlay={!shouldReduce}
          muted={isMuted}
          loop
          playsInline
          preload="metadata"
          aria-label={altText}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onClick={togglePlayback}
          className="relative z-[1] block h-full w-full cursor-pointer object-cover object-center"
        />

        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={isPlaying ? `Pause ${title} video` : `Play ${title} video`}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 bg-[#0D0D0E]/85 border border-[#FAF9F6]/25 text-[#FAF9F6] text-[11px] uppercase tracking-[0.16em] hover:border-[#D6B46A] hover:text-[#D6B46A] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D6B46A]"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? `Unmute ${title} audio` : `Mute ${title} audio`}
            className="inline-flex items-center justify-center min-h-[44px] w-[44px] bg-[#0D0D0E]/85 border border-[#FAF9F6]/25 text-[#FAF9F6] hover:border-[#D6B46A] hover:text-[#D6B46A] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D6B46A]"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Volume2 className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
