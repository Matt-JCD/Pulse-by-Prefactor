'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { MixResponse } from '@/lib/api';
import { ACCOUNTS, CATEGORY_MAP } from '../types';

const MIX_ACCOUNTS = ACCOUNTS.slice(0, 3); // Matt LinkedIn, Prefactor LinkedIn, Prefactor X

const CATEGORY_KEYS = [
  'ecosystem', 'governance', 'security', 'enterprise_ai',
  'podcast_events', 'founder', 'direct_value', 'product',
];

interface Props {
  /** Changes when posts are added/removed, triggering a re-fetch */
  refreshKey: number;
}

export function WeeklyMixPanel({ refreshKey }: Props) {
  const [data, setData] = useState<Record<string, MixResponse>>({});
  const [weekLabel, setWeekLabel] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const results = await Promise.all(
          MIX_ACCOUNTS.map((acc) => api.composer.mix(acc.slug)),
        );
        if (cancelled) return;

        const map: Record<string, MixResponse> = {};
        for (const r of results) {
          map[r.account] = r;
          if (!weekLabel) setWeekLabel(r.week);
        }
        setData(map);
      } catch {
        // Silently fail — panel is informational
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const hasData = Object.keys(data).length > 0;
  if (!hasData) return null;

  const totalPosts = Object.values(data).reduce(
    (sum, r) => sum + Object.values(r.mix).reduce((a, b) => a + b, 0),
    0,
  );

  return (
    <section className="mb-6 rounded-lg border border-zinc-800/60 bg-[#111113] p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          This Week
        </h2>
        {weekLabel && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-medium">
            {weekLabel}
          </span>
        )}
        <span className="text-[10px] text-zinc-600">
          {totalPosts} post{totalPosts !== 1 ? 's' : ''} scheduled
        </span>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-3 gap-4">
        {MIX_ACCOUNTS.map((acc) => {
          const mix = data[acc.slug]?.mix;
          if (!mix) return null;

          return (
            <div key={acc.slug}>
              <p
                className="text-[10px] font-medium mb-2 pb-1 border-b border-zinc-800/60"
                style={{ color: acc.badgeColor }}
              >
                {acc.label}
              </p>
              <div className="space-y-0.5">
                {CATEGORY_KEYS.map((cat) => {
                  const count = mix[cat] ?? 0;
                  const threshold = data[acc.slug]?.threshold ?? 2;
                  const isOver = count >= threshold;
                  const catInfo = CATEGORY_MAP[cat];

                  return (
                    <div key={cat} className="flex items-center justify-between">
                      <span className={`text-[10px] ${count === 0 ? 'text-zinc-600' : 'text-zinc-400'}`}>
                        {catInfo?.label || cat}
                      </span>
                      <span
                        className={`text-[10px] font-medium tabular-nums ${
                          isOver
                            ? 'text-amber-400'
                            : count === 0
                              ? 'text-zinc-700'
                              : 'text-zinc-400'
                        }`}
                      >
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
