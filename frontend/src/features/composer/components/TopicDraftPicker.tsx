'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EmergingTopic } from '@/lib/api';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Props {
  topics: EmergingTopic[];
}

export function TopicDraftPicker({ topics }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [draftingId, setDraftingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (topics.length === 0) return null;

  async function handleDraft(topic: EmergingTopic) {
    setDraftingId(topic.id);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/composer/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: String(topic.id),
          topicTitle: topic.topic_title,
          topicSummary: topic.summary,
          keywords: [topic.keyword],
          sourceLinks: topic.sample_urls || [],
          platform: 'twitter',
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(body.error || `Draft request failed (${res.status})`);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create draft');
    } finally {
      setDraftingId(null);
    }
  }

  return (
    <section className="mb-8">
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
        Draft from today&apos;s topics ({topics.length})
        <span className="ml-2 normal-case tracking-normal text-[10px] text-zinc-600 font-normal">
          For topics not covered in the auto-draft
        </span>
      </button>

      {isOpen && (
        <div className="space-y-2">
          {error && (
            <div className="rounded-md border border-red-900/40 bg-red-900/10 px-4 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {topics.map((topic) => {
            const isEcosystem = topic.category === 'ecosystem';
            const isDrafting = draftingId === topic.id;

            return (
              <div
                key={topic.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-zinc-800/60 bg-[#111113] p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        isEcosystem ? 'bg-aqua/10 text-aqua' : 'bg-sage/10 text-sage'
                      }`}
                    >
                      {topic.category}
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      {topic.post_count} posts
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-100 leading-snug mb-1">
                    {topic.topic_title}
                  </p>
                  <p className="text-xs text-zinc-500 line-clamp-2">
                    {topic.summary}
                  </p>
                </div>
                <button
                  onClick={() => handleDraft(topic)}
                  disabled={isDrafting}
                  className="shrink-0 rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-aqua hover:text-aqua disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isDrafting ? 'Drafting...' : 'Draft'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
