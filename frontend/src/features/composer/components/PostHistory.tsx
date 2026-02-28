'use client';

import { useState } from 'react';
import type { ComposerPost } from '@/lib/api';

interface Props {
  posts: ComposerPost[];
}

function formatAEST(isoString: string | null): string {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleString('en-AU', {
      timeZone: 'Australia/Sydney',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }) + ' AEST';
  } catch {
    return isoString;
  }
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  published: { label: 'Published', className: 'bg-emerald-900/20 text-emerald-400' },
  failed:    { label: 'Failed',    className: 'bg-red-900/20 text-red-400' },
  rejected:  { label: 'Rejected',  className: 'bg-zinc-800 text-zinc-500' },
};

export function PostHistory({ posts }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  if (posts.length === 0) return null;

  const published = posts.filter((p) => p.status === 'published').length;
  const failed = posts.filter((p) => p.status === 'failed').length;
  const rejected = posts.filter((p) => p.status === 'rejected').length;

  const summary = [
    published > 0 && `${published} published`,
    failed > 0 && `${failed} failed`,
    rejected > 0 && `${rejected} rejected`,
  ].filter(Boolean).join(', ');

  return (
    <section>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors mb-3"
      >
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        Today&apos;s activity ({summary})
      </button>

      {isOpen && (
        <div className="flex flex-col gap-2">
          {posts.map((post) => {
            const style = STATUS_STYLES[post.status] || STATUS_STYLES.rejected;

            return (
              <div
                key={post.id}
                className="rounded-lg border border-zinc-800/40 bg-[#111113] p-4 opacity-80"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
                      {post.platform === 'twitter' ? 'X' : 'LinkedIn'}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${style.className}`}>
                      {style.label}
                    </span>
                    {post.source_topic && (
                      <span className="text-xs text-zinc-600 truncate max-w-[250px]">
                        {post.source_topic}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-600">
                    {formatAEST(post.published_at || post.updated_at)}
                  </span>
                </div>
                <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2">
                  {post.content}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
