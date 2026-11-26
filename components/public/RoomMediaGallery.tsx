'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { MediaAsset } from '@/lib/types';

interface RoomMediaGalleryProps {
  roomName: string;
  assets: MediaAsset[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  portraitMode?: boolean;
  portraitCoverMode?: boolean;
}

const SLIDE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function RoomMediaGallery({
  roomName,
  assets,
  currentIndex,
  onSelectIndex,
  portraitMode = false,
  portraitCoverMode = false,
}: RoomMediaGalleryProps) {
  const shouldReduce = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const didDragRef = useRef(false);
  const [direction, setDirection] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const safeIndex = Math.min(Math.max(0, currentIndex), Math.max(0, assets.length - 1));
  const activeAsset = assets[safeIndex] ?? null;
  const isVideoSlide = activeAsset?.media_type === 'video';

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideoSlide) return;

    if (shouldReduce) {
      video.pause();
      return;
    }

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Poster remains visible if browser blocks autoplay
      });
    }
  }, [isVideoSlide, safeIndex, shouldReduce]);

  const goToIndex = (targetIdx: number) => {
    if (assets.length <= 1) return;
    const normalized = (targetIdx + assets.length) % assets.length;
    if (normalized === safeIndex) return;
    const forwardDist = (normalized - safeIndex + assets.length) % assets.length;
    const backwardDist = (safeIndex - normalized + assets.length) % assets.length;
    setDirection(forwardDist <= backwardDist ? 1 : -1);
    onSelectIndex(normalized);
  };

  const handleStep = (delta: number) => {
    if (assets.length <= 1) return;
    setDirection(delta >= 0 ? 1 : -1);
    const next = (safeIndex + delta + assets.length) % assets.length;
    onSelectIndex(next);
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

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button')) return;
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

    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      didDragRef.current = true;
      handleStep(dx < 0 ? 1 : -1);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button')) return;
    didDragRef.current = false;
    swipeStartX.current = e.clientX;
    swipeStartY.current = e.clientY;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || swipeStartX.current === null || swipeStartY.current === null) {
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

  const isConstrainedPortrait = portraitMode || portraitCoverMode;

  const frameWrapperClass = isConstrainedPortrait
    ? 'w-full max-w-xl mx-auto'
    : 'w-full';

  const stageAspectClass = portraitCoverMode
    ? 'aspect-[3/4]'
    : portraitMode
      ? 'aspect-[4/5]'
      : 'aspect-[16/10]';

  return (
    <div className={frameWrapperClass}>
      {/* Main Swipeable Media Stage */}
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={`${roomName} visual gallery`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className={`relative ${stageAspectClass} w-full overflow-hidden border border-[#E6E1D8] bg-[#161513] select-none touch-pan-y focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C6822] ${
          assets.length > 1 ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
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
                    muted
                    loop
                    playsInline
                    preload="none"
                    aria-label={activeAsset.alt_text || `${roomName} walkthrough video`}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onClick={toggleVideoPlayback}
                    className="h-full w-full bg-[#0D0D0E] object-cover object-center"
                  />

                  <button
                    type="button"
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      didDragRef.current = false;
                      toggleVideoPlayback();
                    }}
                    aria-label={isPlaying ? `Pause ${roomName} video` : `Play ${roomName} video`}
                    className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 bg-[#0D0D0E]/80 border border-[#FAF9F6]/25 text-[#FAF9F6] text-[11px] uppercase tracking-[0.16em] hover:border-[#D6B46A] hover:text-[#D6B46A] transition-colors"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Play Video</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <Image
                  src={activeAsset.public_url}
                  alt={activeAsset.alt_text || activeAsset.title || roomName}
                  fill
                  loading="lazy"
                  draggable={false}
                  referrerPolicy="no-referrer"
                  sizes={isConstrainedPortrait ? '(max-width: 1024px) 100vw, 576px' : '(max-width: 1024px) 100vw, 62vw'}
                  className="object-cover object-center"
                />
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="relative flex h-full w-full flex-col justify-between p-6 sm:p-8 bg-gradient-to-br from-[#F4F1EA] via-[#EAE5DC] to-[#E2DDD2] text-[#171614]">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-[#8C6822]">
              <span>Charlees Hotel &amp; Suites</span>
              <span>{roomName}</span>
            </div>
            <div className="space-y-2 max-w-md">
              <p className="font-display text-2xl sm:text-3xl font-normal">
                {roomName} Photography
              </p>
              <p className="text-xs leading-relaxed text-[#5C574F]">
                Verified property photographs for the {roomName} appear here once uploaded by Charlees Hotel management in the Media Library. No artificial or generic stock photos are displayed.
              </p>
            </div>
            <span className="text-[11px] font-mono-tabular uppercase tracking-[0.16em] text-[#6B6459]">
              Abraka · Delta State
            </span>
          </div>
        )}

        {/* Prev / Next Navigation Buttons */}
        {assets.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => handleStep(-1)}
              aria-label={`Previous ${roomName} visual`}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-11 w-11 bg-[#0D0D0E]/75 border border-[#FAF9F6]/20 text-[#FAF9F6] flex items-center justify-center hover:bg-[#0D0D0E] hover:border-[#D6B46A] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => handleStep(1)}
              aria-label={`Next ${roomName} visual`}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-11 w-11 bg-[#0D0D0E]/75 border border-[#FAF9F6]/20 text-[#FAF9F6] flex items-center justify-center hover:bg-[#0D0D0E] hover:border-[#D6B46A] transition-colors"
            >
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="absolute bottom-3 right-3 z-10 bg-[#0D0D0E]/85 border border-[#FAF9F6]/15 text-[#FAF9F6] px-3 py-1 text-[11px] font-mono-tabular">
              {safeIndex + 1} / {assets.length}
              {isVideoSlide ? ' · Video' : ''}
            </div>
          </>
        ) : null}
      </div>

      {/* Active Visual Title + Swipe Hint */}
      {activeAsset ? (
        <div className="mt-3 flex items-center justify-between gap-4 text-xs text-[#5C574F]">
          <p className="truncate">{activeAsset.title || roomName}</p>
          {assets.length > 1 ? (
            <span className="text-[11px] uppercase tracking-[0.14em] text-[#8C6822] whitespace-nowrap shrink-0">
              Swipe or tap arrows
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Clear Dot Navigation Indicators */}
      {assets.length > 1 ? (
        <div
          className="mt-3 flex flex-wrap items-center justify-center gap-1"
          role="tablist"
          aria-label={`${roomName} slide indicators`}
        >
          {assets.map((asset, idx) => {
            const isActive = idx === safeIndex;
            return (
              <button
                key={asset.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={
                  asset.media_type === 'video'
                    ? `View ${roomName} video tour (slide ${idx + 1})`
                    : `View ${roomName} photo ${idx + 1}`
                }
                onClick={() => goToIndex(idx)}
                className="py-1.5 px-1 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-[#8C6822]"
              >
                <span
                  className={`block h-1.5 transition-all duration-200 ${
                    isActive
                      ? 'w-5 bg-[#0D0D0E]'
                      : 'w-1.5 bg-[#C8C0B2] hover:bg-[#8C6822]'
                  }`}
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
