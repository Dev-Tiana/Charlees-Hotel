'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { MediaAsset } from '@/lib/types';

interface ExperienceMediaGalleryProps {
  title: string;
  subtitle?: string;
  assets: MediaAsset[];
  aspectClass?: string;
  maxWidthClass?: string;
  tone?: 'light' | 'dark';
}

const SLIDE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const OBJECT_POSITION_CLASSES: Record<
  NonNullable<MediaAsset['object_position']>,
  string
> = {
  center: 'object-center',
  'center-lower': 'object-[50%_78%]',
  'right-mid': 'object-[78%_54%]',
  'top-mid': 'object-[50%_45%]',
};

export function ExperienceMediaGallery({
  title,
  subtitle,
  assets,
  aspectClass = 'aspect-[4/5]',
  maxWidthClass = 'max-w-[460px]',
  tone = 'light',
}: ExperienceMediaGalleryProps) {
  const isDark = tone === 'dark';
  const shouldReduce = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const didDragRef = useRef(false);

  const orderedAssets = useMemo(() => {
    return [...assets].sort((a, b) => {
      if (a.media_type !== b.media_type) {
        return a.media_type === 'video' ? -1 : 1;
      }
      return a.sort_order - b.sort_order;
    });
  }, [assets]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const safeIndex = Math.min(
    Math.max(0, currentIndex),
    Math.max(0, orderedAssets.length - 1)
  );
  const activeAsset = orderedAssets[safeIndex] ?? null;
  const isVideoSlide = activeAsset?.media_type === 'video';

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideoSlide) return;

    video.muted = isMuted;

    if (shouldReduce) {
      video.pause();
      return;
    }

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Poster stays visible when browser autoplay is blocked
      });
    }
  }, [isVideoSlide, safeIndex, shouldReduce, isMuted]);

  const goToIndex = (targetIdx: number) => {
    if (orderedAssets.length <= 1) return;
    const normalized = (targetIdx + orderedAssets.length) % orderedAssets.length;
    if (normalized === safeIndex) return;
    const forwardDist =
      (normalized - safeIndex + orderedAssets.length) % orderedAssets.length;
    const backwardDist =
      (safeIndex - normalized + orderedAssets.length) % orderedAssets.length;
    setDirection(forwardDist <= backwardDist ? 1 : -1);
    setCurrentIndex(normalized);
  };

  const handleStep = (delta: number) => {
    if (orderedAssets.length <= 1) return;
    setDirection(delta >= 0 ? 1 : -1);
    setCurrentIndex(
      (prev) => (prev + delta + orderedAssets.length) % orderedAssets.length
    );
  };

  const toggleVideoPlayback = () => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
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

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, [data-video-controls="true"]')) return;
    didDragRef.current = false;
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (swipeStartX.current === null || swipeStartY.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? swipeStartX.current;
    const endY = e.changedTouches[0]?.clientY ?? swipeStartY.current;
    const dx = endX - swipeStartX.current;
    const dy = endY - swipeStartY.current;
    swipeStartX.current = null;
    swipeStartY.current = null;

    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      didDragRef.current = true;
      handleStep(dx < 0 ? 1 : -1);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, [data-video-controls="true"]')) return;
    didDragRef.current = false;
    swipeStartX.current = e.clientX;
    swipeStartY.current = e.clientY;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (
      e.pointerType !== 'mouse' ||
      swipeStartX.current === null ||
      swipeStartY.current === null
    ) {
      return;
    }
    const dx = e.clientX - swipeStartX.current;
    const dy = e.clientY - swipeStartY.current;
    swipeStartX.current = null;
    swipeStartY.current = null;

    if (Math.abs(dx) > 12) {
      didDragRef.current = true;
    }

    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      handleStep(dx < 0 ? 1 : -1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handleStep(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleStep(1);
    }
  };

  const posClass = activeAsset?.object_position
    ? OBJECT_POSITION_CLASSES[activeAsset.object_position]
    : 'object-center';

  return (
    <div className={`w-full ${maxWidthClass} mx-auto`}>
      {/* Uniform Swipeable Experience Stage */}
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={`${title} experience gallery`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className={`relative ${aspectClass} w-full overflow-hidden border bg-[#161513] select-none touch-pan-y focus-visible:outline-2 focus-visible:outline-offset-2 ${
          isDark
            ? 'border-[#2C2822] focus-visible:outline-[#D6B46A]'
            : 'border-[#E6E1D8] focus-visible:outline-[#8C6822]'
        } ${orderedAssets.length > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        {activeAsset?.public_url ? (
          <AnimatePresence initial={false} mode="wait" custom={direction}>
            <motion.div
              key={activeAsset.id}
              custom={direction}
              initial={
                shouldReduce
                  ? { opacity: 1 }
                  : { opacity: 0, x: direction * 28 }
              }
              animate={{ opacity: 1, x: 0 }}
              exit={
                shouldReduce
                  ? { opacity: 0 }
                  : { opacity: 0, x: direction * -28 }
              }
              transition={{ duration: shouldReduce ? 0 : 0.28, ease: SLIDE_EASE }}
              className="absolute inset-0 h-full w-full"
            >
              {activeAsset.media_type === 'video' ? (
                <div className="relative h-full w-full bg-[#0D0D0E]">
                  <video
                    ref={videoRef}
                    src={activeAsset.public_url}
                    poster={activeAsset.poster_url}
                    autoPlay={!shouldReduce}
                    muted={isMuted}
                    loop
                    playsInline
                    preload="metadata"
                    aria-label={activeAsset.alt_text || `${title} tour video`}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onClick={toggleVideoPlayback}
                    className={`h-full w-full object-cover ${posClass}`}
                  />

                  {/* Playback Controls Bar (isolated from swipe gestures) */}
                  <div
                    data-video-controls="true"
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                    className="absolute bottom-3 left-3 z-10 flex items-center gap-2"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        didDragRef.current = false;
                        toggleVideoPlayback();
                      }}
                      aria-label={
                        isPlaying ? `Pause ${title} video` : `Play ${title} video`
                      }
                      className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 bg-[#0D0D0E]/85 border border-[#FAF9F6]/25 text-[#FAF9F6] text-[11px] uppercase tracking-[0.16em] hover:border-[#D6B46A] hover:text-[#D6B46A] transition-colors"
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
                      onClick={(e) => {
                        e.stopPropagation();
                        didDragRef.current = false;
                        toggleMute();
                      }}
                      aria-label={
                        isMuted ? `Unmute ${title} audio` : `Mute ${title} audio`
                      }
                      className="inline-flex items-center justify-center min-h-[40px] w-[40px] bg-[#0D0D0E]/85 border border-[#FAF9F6]/25 text-[#FAF9F6] hover:border-[#D6B46A] hover:text-[#D6B46A] transition-colors"
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Volume2 className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <Image
                  src={activeAsset.public_url}
                  alt={activeAsset.alt_text || activeAsset.title || title}
                  fill
                  draggable={false}
                  referrerPolicy="no-referrer"
                  sizes="(max-width: 1024px) 100vw, 460px"
                  className={`object-cover ${posClass}`}
                />
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="relative flex h-full w-full flex-col justify-between p-6 sm:p-8 bg-gradient-to-br from-[#F4F1EA] via-[#EAE5DC] to-[#E2DDD2] text-[#171614]">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-[#8C6822]">
              <span>Charlees Hotel &amp; Suites</span>
              <span>{subtitle || title}</span>
            </div>
            <p className="font-display text-2xl sm:text-3xl font-normal">{title}</p>
            <span className="text-[11px] font-mono-tabular uppercase tracking-[0.16em] text-[#6B6459]">
              Abraka · Delta State
            </span>
          </div>
        )}

        {/* Desktop Navigation Arrows + Mobile Accessible Arrows */}
        {orderedAssets.length > 1 ? (
          <>
            <button
              type="button"
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => handleStep(-1)}
              aria-label={`Previous ${title} visual`}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-11 w-11 bg-[#0D0D0E]/75 border border-[#FAF9F6]/20 text-[#FAF9F6] flex items-center justify-center hover:bg-[#0D0D0E] hover:border-[#D6B46A] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => handleStep(1)}
              aria-label={`Next ${title} visual`}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-11 w-11 bg-[#0D0D0E]/75 border border-[#FAF9F6]/20 text-[#FAF9F6] flex items-center justify-center hover:bg-[#0D0D0E] hover:border-[#D6B46A] transition-colors"
            >
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="absolute bottom-3 right-3 z-10 bg-[#0D0D0E]/85 border border-[#FAF9F6]/15 text-[#FAF9F6] px-3 py-1 text-[11px] font-mono-tabular">
              {safeIndex + 1} / {orderedAssets.length}
              {isVideoSlide ? ' · Video' : ''}
            </div>
          </>
        ) : null}
      </div>

      {/* Active Visual Title & Swipe Cue */}
      {activeAsset ? (
        <div
          className={`mt-3 flex items-center justify-between gap-4 text-xs ${
            isDark ? 'text-[#B5AFA4]' : 'text-[#5C574F]'
          }`}
        >
          <p
            className={`truncate font-medium ${
              isDark ? 'text-[#FAF9F6]' : 'text-[#171614]'
            }`}
          >
            {activeAsset.title || title}
          </p>
          {orderedAssets.length > 1 ? (
            <span
              className={`text-[11px] uppercase tracking-[0.14em] whitespace-nowrap shrink-0 ${
                isDark ? 'text-[#D6B46A]' : 'text-[#8C6822]'
              }`}
            >
              Swipe or tap arrows
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Subtle Pagination Dot Indicators */}
      {orderedAssets.length > 1 ? (
        <div
          className="mt-3 flex flex-wrap items-center justify-center gap-1"
          role="tablist"
          aria-label={`${title} slide indicators`}
        >
          {orderedAssets.map((asset, idx) => {
            const isActive = idx === safeIndex;
            return (
              <button
                key={asset.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={
                  asset.media_type === 'video'
                    ? `View ${title} video tour (slide ${idx + 1})`
                    : `View ${title} photo ${idx + 1}`
                }
                onClick={() => goToIndex(idx)}
                className={`py-1.5 px-1 flex items-center justify-center focus-visible:outline-2 ${
                  isDark
                    ? 'focus-visible:outline-[#D6B46A]'
                    : 'focus-visible:outline-[#8C6822]'
                }`}
              >
                <span
                  className={`block h-1.5 transition-all duration-200 ${
                    isActive
                      ? isDark
                        ? 'w-5 bg-[#D6B46A]'
                        : 'w-5 bg-[#0D0D0E]'
                      : isDark
                      ? 'w-1.5 bg-[#3B352D] hover:bg-[#D6B46A]/80'
                      : 'w-1.5 bg-[#C8C0B2] hover:bg-[#8C6822]'
                  }`}
                />
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Uniform Aspect-Matched Thumbnail Strip */}
      {orderedAssets.length > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {orderedAssets.map((asset, assetIdx) => {
            const isActive = assetIdx === safeIndex;
            const thumbPos = asset.object_position
              ? OBJECT_POSITION_CLASSES[asset.object_position]
              : 'object-center';
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => goToIndex(assetIdx)}
                aria-label={
                  asset.media_type === 'video'
                    ? `Select ${title} video cover`
                    : `Select ${title} photo ${assetIdx + 1}`
                }
                className={`relative overflow-hidden border transition-all ${aspectClass} ${
                  isActive
                    ? isDark
                      ? 'border-[#D6B46A] ring-1 ring-[#D6B46A]'
                      : 'border-[#0D0D0E] ring-1 ring-[#0D0D0E]'
                    : isDark
                    ? 'border-[#2C2822] opacity-75 hover:opacity-100 hover:border-[#8C6822]'
                    : 'border-[#D8D1C5] opacity-75 hover:opacity-100'
                }`}
              >
                {asset.media_type === 'video' ? (
                  <div className="relative h-full w-full bg-[#0D0D0E]">
                    {asset.poster_url ? (
                      <Image
                        src={asset.poster_url}
                        alt={asset.alt_text || `${title} video preview`}
                        fill
                        referrerPolicy="no-referrer"
                        sizes="110px"
                        className={`object-cover ${thumbPos} opacity-85`}
                      />
                    ) : null}
                    <span className="absolute inset-0 flex items-center justify-center bg-[#0D0D0E]/30 text-[#FAF9F6]">
                      <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                    </span>
                  </div>
                ) : (
                  <Image
                    src={asset.public_url}
                    alt={asset.alt_text || `${title} thumbnail ${assetIdx + 1}`}
                    fill
                    referrerPolicy="no-referrer"
                    sizes="110px"
                    className={`object-cover ${thumbPos}`}
                  />
                )}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
