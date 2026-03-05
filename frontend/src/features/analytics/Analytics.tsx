'use client';

import type { AccountSummary, AnalyticsPost, CategoryStats, TimeslotStats } from '@/lib/api';
import { useAnalytics, type Tab, type SortField } from './useAnalytics';

const ACCOUNT_LABELS: Record<string, { label: string; color: string }> = {
  matt_linkedin:     { label: 'Matt (LinkedIn)',      color: '#2563eb' },
  prefactor_linkedin:{ label: 'Prefactor (LinkedIn)', color: '#93D1BD' },
  prefactor_x:       { label: 'Prefactor (X)',        color: '#1a1a2e' },
};

const CATEGORY_LABELS: Record<string, string> = {
  ecosystem: 'Ecosystem', governance: 'Governance', security: 'Security',
  enterprise_ai: 'Enterprise AI', podcast_events: 'Podcast & Events',
  founder: 'Founder', direct_value: 'Direct Value', product: 'Product',
};

const TABS: { key: Tab; label: string }[] = [
  { key: 'posts', label: 'Posts' },
  { key: 'by-category', label: 'By Category' },
  { key: 'time-slots', label: 'Time Slots' },
  { key: 'comparison', label: 'Account Comparison' },
];

const EMPTY_STATE = (
  <div className="rounded-lg border border-zinc-800/60 bg-[#111113] p-8 text-center">
    <p className="text-sm text-zinc-500">
      No data yet — stats will appear once posts have been published and engagement has been fetched.
    </p>
  </div>
);

interface Props {
  initialSummary: AccountSummary[];
}

export function Analytics({ initialSummary }: Props) {
  const h = useAnalytics(initialSummary);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Analytics</h1>
        <p className="text-xs text-zinc-500 mt-1">Engagement performance across accounts</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-zinc-800/60 bg-[#111113] p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => h.setActiveTab(tab.key)}
            className={`rounded-md px-4 py-2 text-xs font-medium transition-colors ${
              h.activeTab === tab.key
                ? 'bg-aqua/10 text-aqua'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {h.activeTab === 'posts' && (
        <PostsTab
          posts={h.sortedPosts}
          loading={h.postsLoading}
          accountFilter={h.accountFilter}
          setAccountFilter={h.setAccountFilter}
          sortField={h.sortField}
          toggleSort={h.toggleSort}
        />
      )}
      {h.activeTab === 'by-category' && (
        <CategoryTab stats={h.categoryStats} loading={h.categoryLoading} />
      )}
      {h.activeTab === 'time-slots' && (
        <TimeslotTab stats={h.timeslotStats} loading={h.timeslotLoading} />
      )}
      {h.activeTab === 'comparison' && (
        <ComparisonTab summary={h.summary} />
      )}
    </div>
  );
}

/* ── Tab 1: Posts ───────────────────────────────────────────── */

function PostsTab({
  posts, loading, accountFilter, setAccountFilter, sortField, toggleSort,
}: {
  posts: AnalyticsPost[];
  loading: boolean;
  accountFilter: string;
  setAccountFilter: (v: string) => void;
  sortField: SortField;
  toggleSort: (f: SortField) => void;
}) {
  const accounts = ['', 'matt_linkedin', 'prefactor_linkedin', 'prefactor_x'];

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex gap-2">
        {accounts.map((slug) => (
          <button
            key={slug}
            onClick={() => setAccountFilter(slug)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              accountFilter === slug
                ? 'bg-aqua/10 text-aqua border border-aqua/30'
                : 'bg-zinc-800/60 text-zinc-400 border border-zinc-800/60 hover:text-zinc-200'
            }`}
          >
            {slug ? (ACCOUNT_LABELS[slug]?.label ?? slug) : 'All'}
          </button>
        ))}
      </div>

      {/* Sort buttons */}
      <div className="flex gap-2 text-[10px] text-zinc-500">
        Sort:
        {(['impressions', 'likes', 'published_at'] as SortField[]).map((f) => (
          <button
            key={f}
            onClick={() => toggleSort(f)}
            className={`px-2 py-0.5 rounded ${sortField === f ? 'bg-zinc-800 text-zinc-200' : 'hover:text-zinc-300'}`}
          >
            {f === 'published_at' ? 'Date' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading && <p className="text-xs text-zinc-500 py-4">Loading...</p>}

      {!loading && posts.length === 0 && EMPTY_STATE}

      {!loading && posts.length > 0 && (
        <div className="space-y-2">
          {posts.map((post) => (
            <PostRow key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

function PostRow({ post }: { post: AnalyticsPost }) {
  const acc = ACCOUNT_LABELS[post.account];
  const catLabel = post.category ? (CATEGORY_LABELS[post.category] ?? post.category) : null;
  const dateStr = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-AU', {
        day: 'numeric', month: 'short', timeZone: 'Australia/Sydney',
      })
    : '—';

  return (
    <div className="rounded-lg border border-zinc-800/60 bg-[#111113] p-4 flex items-center gap-4">
      {/* Account + date + category */}
      <div className="flex flex-col gap-1 w-36 shrink-0">
        <span
          className="rounded px-2 py-0.5 text-[10px] font-medium w-fit"
          style={{ backgroundColor: `${acc?.color || '#27272a'}20`, color: acc?.color || '#a1a1aa' }}
        >
          {acc?.label || post.account}
        </span>
        <span className="text-[10px] text-zinc-500">{dateStr}</span>
        {catLabel && <span className="text-[10px] text-zinc-600">{catLabel}</span>}
      </div>

      {/* Content preview */}
      <p className="flex-1 text-xs text-zinc-400 line-clamp-2 min-w-0">
        {post.content.slice(0, 120)}{post.content.length > 120 ? '...' : ''}
      </p>

      {/* Engagement pills */}
      <div className="flex items-center gap-3 shrink-0">
        <StatPill label="Imp" value={post.impressions} />
        <StatPill label="Likes" value={post.likes} />
        <StatPill label="Cmt" value={post.comments} />
        <StatPill label="Share" value={post.shares} />
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="text-center">
      <div className="text-xs font-medium tabular-nums text-zinc-200">
        {value != null ? value.toLocaleString() : '—'}
      </div>
      <div className="text-[9px] text-zinc-600">{label}</div>
    </div>
  );
}

/* ── Tab 2: By Category ─────────────────────────────────────── */

function CategoryTab({ stats, loading }: { stats: CategoryStats[]; loading: boolean }) {
  if (loading) return <p className="text-xs text-zinc-500 py-4">Loading...</p>;
  if (stats.length === 0) return EMPTY_STATE;

  const accounts = [...new Set(stats.map((s) => s.account))];

  return (
    <div className="space-y-6">
      {accounts.map((account) => {
        const rows = stats.filter((s) => s.account === account);
        const maxImpressions = Math.max(...rows.map((r) => r.avg_impressions ?? 0), 1);
        const topCategory = rows.reduce((best, r) =>
          (r.avg_impressions ?? 0) > (best.avg_impressions ?? 0) ? r : best, rows[0]);

        return (
          <div key={account} className="rounded-lg border border-zinc-800/60 bg-[#111113] p-5">
            <h3 className="text-sm font-medium text-zinc-200 mb-4">
              {ACCOUNT_LABELS[account]?.label ?? account}
            </h3>
            <div className="space-y-3">
              {rows.map((row) => {
                const isTop = row.category === topCategory.category;
                const barWidth = maxImpressions > 0
                  ? ((row.avg_impressions ?? 0) / maxImpressions) * 100
                  : 0;

                return (
                  <div key={row.category} className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400 w-28 shrink-0">
                      {CATEGORY_LABELS[row.category] ?? row.category}
                    </span>
                    <div className="flex-1 h-5 bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isTop ? 'bg-sage' : 'bg-zinc-700'}`}
                        style={{ width: `${Math.max(barWidth, 2)}%` }}
                      />
                    </div>
                    <span className={`text-xs tabular-nums w-16 text-right ${isTop ? 'text-sage font-medium' : 'text-zinc-400'}`}>
                      {row.avg_impressions != null ? Math.round(row.avg_impressions).toLocaleString() : '—'}
                    </span>
                    <span className="text-[10px] text-zinc-500 w-14 text-right tabular-nums">
                      {row.avg_engagement_rate != null ? `${row.avg_engagement_rate.toFixed(1)}%` : '—'}
                    </span>
                    <span className="text-[10px] text-zinc-600 w-10 text-right">
                      {row.post_count}p
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Tab 3: Time Slots ──────────────────────────────────────── */

function TimeslotTab({ stats, loading }: { stats: TimeslotStats[]; loading: boolean }) {
  if (loading) return <p className="text-xs text-zinc-500 py-4">Loading...</p>;
  if (stats.length === 0) return EMPTY_STATE;

  const accounts = [...new Set(stats.map((s) => s.account))];

  return (
    <div className="space-y-6">
      {accounts.map((account) => {
        const rows = stats.filter((s) => s.account === account);
        const maxAvg = Math.max(...rows.map((r) => r.avg_impressions ?? 0), 1);
        const peakRow = rows.reduce((best, r) =>
          (r.avg_impressions ?? 0) > (best.avg_impressions ?? 0) ? r : best, rows[0]);

        // Build all 24 hours, filling gaps
        const hourMap = new Map(rows.map((r) => [r.hour, r]));
        const hours = Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          data: hourMap.get(i) ?? null,
        }));

        return (
          <div key={account} className="rounded-lg border border-zinc-800/60 bg-[#111113] p-5">
            <h3 className="text-sm font-medium text-zinc-200 mb-4">
              {ACCOUNT_LABELS[account]?.label ?? account}
            </h3>
            <div className="flex items-end gap-[3px] h-32">
              {hours.map(({ hour, data }) => {
                const avg = data?.avg_impressions ?? 0;
                const barHeight = maxAvg > 0 ? (avg / maxAvg) * 100 : 0;
                const isPeak = data && hour === peakRow.hour;
                const isLowConfidence = data ? data.post_count < 3 : true;

                return (
                  <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center justify-end h-24">
                      <div
                        className={`w-full rounded-t transition-all ${
                          isPeak ? 'bg-sage' : isLowConfidence ? 'bg-zinc-800/40' : 'bg-zinc-700'
                        }`}
                        style={{ height: `${Math.max(barHeight, 2)}%` }}
                        title={`${String(hour).padStart(2, '0')}:00 — ${Math.round(avg)} avg imp (${data?.post_count ?? 0} posts)`}
                      />
                    </div>
                    <span className={`text-[8px] tabular-nums ${isPeak ? 'text-sage font-medium' : 'text-zinc-600'}`}>
                      {String(hour).padStart(2, '0')}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-4 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sage" /> Peak hour</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-800/40" /> Low confidence (&lt;3 posts)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Tab 4: Account Comparison ──────────────────────────────── */

function ComparisonTab({ summary }: { summary: AccountSummary[] }) {
  if (summary.length === 0) return EMPTY_STATE;

  const linkedin = summary.filter((s) => s.account !== 'prefactor_x');
  const x = summary.filter((s) => s.account === 'prefactor_x');

  return (
    <div className="space-y-6">
      {/* LinkedIn side by side */}
      {linkedin.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-3">LinkedIn</h3>
          <div className="grid grid-cols-2 gap-4">
            {linkedin.map((s) => (
              <SummaryCard key={s.account} data={s} />
            ))}
          </div>
        </div>
      )}

      {/* X */}
      {x.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-3">X (Twitter)</h3>
          <div className="grid grid-cols-2 gap-4">
            {x.map((s) => (
              <SummaryCard key={s.account} data={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ data }: { data: AccountSummary }) {
  const acc = ACCOUNT_LABELS[data.account];

  return (
    <div className="rounded-lg border border-zinc-800/60 bg-[#111113] p-5 space-y-4">
      <span
        className="rounded px-2 py-0.5 text-xs font-medium"
        style={{ backgroundColor: `${acc?.color || '#27272a'}20`, color: acc?.color || '#a1a1aa' }}
      >
        {acc?.label || data.account}
      </span>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-lg font-semibold text-zinc-100 tabular-nums">
            {data.total_posts.toLocaleString()}
          </div>
          <div className="text-[10px] text-zinc-500">Total posts</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-zinc-100 tabular-nums">
            {data.total_impressions.toLocaleString()}
          </div>
          <div className="text-[10px] text-zinc-500">Total impressions</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-zinc-100 tabular-nums">
            {data.avg_engagement_rate != null ? `${data.avg_engagement_rate}%` : '—'}
          </div>
          <div className="text-[10px] text-zinc-500">Avg engagement rate</div>
        </div>
        <div>
          <div className="text-sm font-medium text-sage">
            {data.best_category ? (CATEGORY_LABELS[data.best_category] ?? data.best_category) : '—'}
          </div>
          <div className="text-[10px] text-zinc-500">Top category</div>
        </div>
      </div>

      {data.best_hour != null && (
        <div className="text-[10px] text-zinc-500">
          Best hour: <span className="text-sage font-medium">{String(data.best_hour).padStart(2, '0')}:00 AEST</span>
        </div>
      )}
    </div>
  );
}
