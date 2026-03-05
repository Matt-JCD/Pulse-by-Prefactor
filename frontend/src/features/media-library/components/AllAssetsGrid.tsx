'use client';

import type { MediaAsset, AssetType } from '@/lib/api';
import { AssetTile } from './AssetTile';

const FILTER_OPTIONS: { value: AssetType | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'clip', label: 'Clips' },
  { value: 'graphic', label: 'Graphics' },
  { value: 'headshot', label: 'Headshots' },
  { value: 'show_notes', label: 'Show Notes' },
  { value: 'questions', label: 'Questions' },
];

interface Props {
  allAssets: { asset: MediaAsset; episodeName: string }[];
  isLoading: boolean;
  assetTypeFilter: AssetType | '';
  onFilterChange: (type: AssetType | '') => void;
}

export function AllAssetsGrid({ allAssets, isLoading, assetTypeFilter, onFilterChange }: Props) {
  const filtered = assetTypeFilter
    ? allAssets.filter((a) => a.asset.asset_type === assetTypeFilter)
    : allAssets;

  return (
    <div>
      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onFilterChange(opt.value)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              assetTypeFilter === opt.value
                ? 'bg-aqua/15 text-aqua'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <p className="text-xs text-zinc-500 py-8 text-center">Loading assets...</p>
      )}

      {/* Grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((item) => (
            <AssetTile
              key={item.asset.id}
              asset={item.asset}
              episodeName={item.episodeName}
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <p className="text-xs text-zinc-600 py-12 text-center">
          {allAssets.length === 0
            ? 'No assets found. Upload assets from the Episodes tab.'
            : 'No assets match this filter.'}
        </p>
      )}
    </div>
  );
}
