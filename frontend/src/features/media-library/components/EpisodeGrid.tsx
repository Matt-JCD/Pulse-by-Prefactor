'use client';

import type { Episode } from '@/lib/api';

interface Props {
  episodes: Episode[];
  selectedId: string | null;
  assetCounts: Record<string, number>;
  onSelect: (id: string | null) => void;
}

export function EpisodeGrid({ episodes, selectedId, assetCounts, onSelect }: Props) {
  if (episodes.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {episodes.map((ep) => {
        const isSelected = selectedId === ep.id;
        const count = assetCounts[ep.id];

        return (
          <button
            key={ep.id}
            onClick={() => onSelect(ep.id)}
            className={`text-left rounded-lg border p-4 transition-colors ${
              isSelected
                ? 'border-aqua/60 bg-aqua/5'
                : 'border-zinc-800/60 bg-[#111113] hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {ep.episode_number != null && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-medium">
                  Ep {ep.episode_number}
                </span>
              )}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  ep.status === 'published'
                    ? 'bg-aqua/10 text-aqua'
                    : 'bg-amber-900/20 text-amber-400'
                }`}
              >
                {ep.status === 'published' ? 'Published' : 'Upcoming'}
              </span>
            </div>

            <p className="text-sm font-semibold text-zinc-100 leading-snug mb-1">
              {ep.title}
            </p>

            {ep.guest_name && (
              <p className="text-xs text-zinc-500 mb-2">with {ep.guest_name}</p>
            )}

            <div className="flex items-center justify-between text-[10px] text-zinc-600">
              <span>
                {ep.publish_date
                  ? new Date(ep.publish_date + 'T00:00:00').toLocaleDateString('en-AU', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'No date'}
              </span>
              {count != null && (
                <span>{count} asset{count !== 1 ? 's' : ''}</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
