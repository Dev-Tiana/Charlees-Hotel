'use client';

import { useState } from 'react';
import { MediaAsset } from '@/lib/types';
import { MediaFrame } from '@/components/public/MediaFrame';
import { ExperienceMediaGallery } from '@/components/public/ExperienceMediaGallery';

type FilterGroup = 'all' | 'architecture' | 'rooms' | 'facilities' | 'abraka';

const FILTER_OPTIONS: { id: FilterGroup; label: string }[] = [
  { id: 'all', label: 'All Property Visuals' },
  { id: 'architecture', label: 'Architecture & Grounds' },
  { id: 'rooms', label: 'Rooms & Suites' },
  { id: 'facilities', label: 'Pool, Rooftop & Dining' },
  { id: 'abraka', label: 'Abraka Corridor' },
];

function matchesGroup(asset: MediaAsset, group: FilterGroup): boolean {
  if (group === 'all') return true;
  if (group === 'architecture') {
    return ['hero', 'exterior', 'gallery'].includes(asset.section_key);
  }
  if (group === 'rooms') {
    return ['room_standard', 'room_twin', 'room_deluxe', 'room_luxury'].includes(
      asset.section_key
    );
  }
  if (group === 'facilities') {
    return ['pool', 'rooftop', 'dining'].includes(asset.section_key);
  }
  return (
    asset.section_key === 'abraka' ||
    asset.section_key === 'exp_river_ethiope' ||
    asset.section_key === 'exp_abraka_market' ||
    asset.section_key === 'exp_abraka_top'
  );
}

export function GalleryArchiveClient({ assets }: { assets: MediaAsset[] }) {
  const [group, setGroup] = useState<FilterGroup>('all');

  const filtered = assets.filter((item) => matchesGroup(item, group));

  return (
    <div className="space-y-10 pt-8">
      <div
        role="tablist"
        aria-label="Filter gallery by property section"
        className="flex flex-wrap items-center gap-2 border-b border-[#E6E1D8] pb-6"
      >
        {FILTER_OPTIONS.map((opt) => {
          const active = group === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setGroup(opt.id)}
              className={`px-4 py-2 text-xs uppercase tracking-[0.16em] font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[#0D0D0E] text-[#FAF9F6]'
                  : 'border border-[#D8D1C5] text-[#4A453E] bg-white hover:border-[#8C6822] hover:text-[#171614]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {group === 'abraka' && filtered.length > 0 ? (
        <div className="border border-[#E6E1D8] bg-[#FAF9F6] p-6 sm:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[#8C6822]">
                Local Destination · Abraka Corridor
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-normal text-[#171614] text-balance">
                River Ethiope Experience Gallery
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-[#5C574F]">
                Swipe through the River Ethiope tour video and riverfront photographs showing crystal-clear spring water and canoe crossings minutes from Charlees Hotel &amp; Suites.
              </p>
            </div>
            <div className="lg:col-span-7">
              <ExperienceMediaGallery
                title="River Ethiope"
                subtitle="Abraka Corridor"
                assets={filtered}
                aspectClass="aspect-[4/5]"
                maxWidthClass="max-w-2xl"
              />
            </div>
          </div>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((asset, i) => (
            <MediaFrame
              key={asset.id}
              asset={asset}
              fallbackTitle={asset.title}
              figureCode={`Archive ${String(i + 1).padStart(2, '0')}`}
              caption={asset.title}
              aspectClass="aspect-[4/3]"
            />
          ))}
        </div>
      ) : (
        <div className="border border-[#E6E1D8] bg-white p-10 text-center text-sm text-[#5C574F]">
          No published visuals in this section yet.
        </div>
      )}
    </div>
  );
}
