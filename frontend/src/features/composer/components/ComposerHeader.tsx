import type { ComposerStats } from '@/lib/api';

interface Props {
  stats: ComposerStats;
}

export function ComposerHeader({ stats }: Props) {
  const { twitter } = stats;
  const pct = twitter.limit > 0 ? (twitter.count / twitter.limit) * 100 : 0;

  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight">Composer</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Review and approve AI-drafted posts before they go live.
      </p>

      {/* Stats bar */}
      <div className="mt-6 flex items-center gap-6">
        {/* X / Twitter counter */}
        <div className="flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-[#111113] px-4 py-3">
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            X today
          </span>
          <span className="tabular-nums text-sm font-semibold text-zinc-200">
            {twitter.count}
            <span className="text-zinc-500"> / {twitter.limit}</span>
          </span>
          {/* Mini progress bar */}
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-aqua transition-all duration-300"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>

        {/* LinkedIn — greyed out */}
        <div className="flex items-center gap-3 rounded-lg border border-zinc-800/40 bg-[#111113] px-4 py-3 opacity-40">
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            LinkedIn
          </span>
          <span className="text-xs text-zinc-600">Pending</span>
        </div>
      </div>
    </div>
  );
}
