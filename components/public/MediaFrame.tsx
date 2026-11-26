import Image from 'next/image';
import { Camera } from 'lucide-react';
import { MediaAsset } from '@/lib/types';

interface MediaFrameProps {
  asset?: MediaAsset | null;
  fallbackTitle: string;
  figureCode?: string;
  caption?: string;
  aspectClass?: string;
  tone?: 'light' | 'dark';
  priority?: boolean;
}

export function MediaFrame({
  asset,
  fallbackTitle,
  figureCode,
  caption,
  aspectClass = 'aspect-[4/3]',
  tone = 'light',
  priority = false,
}: MediaFrameProps) {
  const isDark = tone === 'dark';

  return (
    <figure className="w-full">
      <div
        className={`relative w-full overflow-hidden border ${aspectClass} ${
          isDark
            ? 'bg-[#161513] border-[#2C2822]'
            : 'bg-[#F2EFE9] border-[#E3DDD2]'
        }`}
      >
        {asset?.public_url ? (
          asset.media_type === 'video' ? (
            <video
              src={asset.public_url}
              poster={asset.poster_url}
              controls
              preload="metadata"
              playsInline
              className="h-full w-full object-cover"
              aria-label={asset.alt_text}
            />
          ) : (
            <Image
              src={asset.public_url}
              alt={asset.alt_text || fallbackTitle}
              fill
              priority={priority}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 45vw"
              className="object-cover transition-transform duration-700 hover:scale-[1.02]"
              referrerPolicy="no-referrer"
            />
          )
        ) : (
          <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] uppercase tracking-[0.22em] ${
                  isDark ? 'text-[#D6B46A]' : 'text-[#8C6822]'
                }`}
              >
                {figureCode || 'Charlees Archive'}
              </span>
              <Camera
                className={`w-4 h-4 ${
                  isDark ? 'text-[#6B6459]' : 'text-[#9C9486]'
                }`}
                aria-hidden="true"
              />
            </div>

            <div className="my-auto py-4">
              <div
                className={`h-px w-12 mb-4 ${
                  isDark ? 'bg-[#D6B46A]/45' : 'bg-[#8C6822]/40'
                }`}
              />
              <p
                className={`font-display text-2xl sm:text-3xl font-normal tracking-tight text-balance ${
                  isDark ? 'text-[#F5F2EB]' : 'text-[#171614]'
                }`}
              >
                {fallbackTitle}
              </p>
              <p
                className={`mt-2 text-xs leading-relaxed max-w-xs ${
                  isDark ? 'text-[#A8A298]' : 'text-[#5C574F]'
                }`}
              >
                Authentic property photography slot ready in the management media library.
              </p>
            </div>

            <div
              className={`border-t pt-3 text-[11px] uppercase tracking-[0.18em] ${
                isDark
                  ? 'border-[#2C2822] text-[#8E877B]'
                  : 'border-[#E3DDD2] text-[#7A7367]'
              }`}
            >
              Charlees Hotel &amp; Suites · Abraka
            </div>
          </div>
        )}
      </div>
      {caption ? (
        <figcaption
          className={`mt-2.5 font-display italic text-sm ${
            isDark ? 'text-[#A8A298]' : 'text-[#5C574F]'
          }`}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
