'use client';

import dynamic from 'next/dynamic';
import type { EmergingTopic } from '@/lib/api';
import { useEffect, useRef, useState } from 'react';

const WordCloud = dynamic(() => import('react-d3-cloud'), { ssr: false });

interface Props {
  topics: EmergingTopic[];
  todayDate: string;
}

interface CloudWord {
  text: string;
  value: number;   // post_count — used for sorting
  rank: number;    // 0 = top topic, drives font size (not value, to avoid flat sizing)
  color: string;
  urls: string[];
}

// Rank 0 = biggest, rank 1 = medium, rank 2 = smallest
const RANK_FONT_SIZES = [46, 28, 18];

interface Popup {
  x: number;
  y: number;
  title: string;
  urls: string[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function urlLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    if (host.includes('reddit.com')) return 'Reddit thread';
    if (host.includes('ycombinator.com')) return 'HN thread';
    if (host.includes('twitter.com') || host.includes('x.com')) return 'Twitter thread';
    return 'Read article';
  } catch {
    return 'Read article';
  }
}

function getYesterday(todayDate: string): string {
  const [y, m, d] = todayDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

// Build cloud words from emerging_topics topic_titles.
// Each word = a specific topic that appeared today.
// Size = today's post_count. Colour = momentum vs yesterday.
function buildCloudData(
  topics: EmergingTopic[],
  category: string,
  todayDate: string,
): CloudWord[] {
  const yesterday = getYesterday(todayDate);

  // Aggregate by topic_title: today post_count, yesterday post_count, collected URLs
  const byTitle = new Map<string, { today: number; yesterday: number; urls: Set<string> }>();

  for (const t of topics) {
    if (t.category !== category) continue;
    if (t.date !== todayDate && t.date !== yesterday) continue;

    const entry = byTitle.get(t.topic_title) ?? { today: 0, yesterday: 0, urls: new Set() };
    if (t.date === todayDate) {
      entry.today += t.post_count;
      (t.sample_urls ?? []).forEach((u) => entry.urls.add(u));
    }
    if (t.date === yesterday) {
      entry.yesterday += t.post_count;
    }
    byTitle.set(t.topic_title, entry);
  }

  const unsorted: Omit<CloudWord, 'rank'>[] = [];
  for (const [text, data] of byTitle) {
    if (data.today === 0) continue;

    let color: string;
    if (data.yesterday === 0) {
      color = '#08CAA6';
    } else {
      const ratio = data.today / data.yesterday;
      if (ratio > 1.1) color = '#08CAA6';
      else if (ratio < 0.9) color = '#555555';
      else color = '#93D1BD';
    }

    unsorted.push({ text, value: data.today, color, urls: Array.from(data.urls) });
  }

  // Top 3 by post_count. Assign rank for font size so visual hierarchy always shows
  // even when all counts are identical (e.g. all post_count = 1).
  return unsorted
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((w, i) => ({ ...w, rank: i }));
}

// ─── Popup ──────────────────────────────────────────────────────────────────

function TopicPopup({ popup, onClose }: { popup: Popup; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const left = Math.min(popup.x + 10, window.innerWidth - 280);
  const top  = Math.min(popup.y + 10, window.innerHeight - 180);

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', left, top, zIndex: 50 }}
      className="w-64 bg-[#1A1A1D] border border-zinc-700 rounded-lg shadow-xl p-3"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-xs font-semibold text-zinc-200 leading-snug">{popup.title}</p>
        <button
          onClick={onClose}
          className="text-zinc-600 hover:text-zinc-300 shrink-0 text-xs leading-none mt-0.5"
        >
          ✕
        </button>
      </div>

      {popup.urls.length === 0 ? (
        <p className="text-xs text-zinc-600 italic">No source links available.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {popup.urls.slice(0, 3).map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-aqua hover:underline"
            >
              <span className="text-zinc-600">→</span>
              {urlLabel(url)}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Panel ──────────────────────────────────────────────────────────────────

function CloudPanel({
  label,
  words,
}: {
  label: string;
  words: CloudWord[];
}) {
  const [popup, setPopup] = useState<Popup | null>(null);

  if (words.length === 0) {
    return (
      <div className="bg-[#111113] rounded-lg border border-zinc-800/60 p-5">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">{label}</p>
        <p className="text-sm text-zinc-600 text-center py-8">
          No topics yet — run the collector to populate.
        </p>
      </div>
    );
  }

  function handleWordClick(event: MouseEvent, word: object) {
    const cw = word as CloudWord;
    // Single URL → open directly; multiple → show popup
    if (cw.urls.length === 1) {
      window.open(cw.urls[0], '_blank', 'noopener,noreferrer');
      return;
    }
    setPopup({ x: event.clientX, y: event.clientY, title: cw.text, urls: cw.urls });
  }

  return (
    <div className="bg-[#111113] rounded-lg border border-zinc-800/60 p-5">
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">{label}</p>

      <div style={{ height: 240 }} className="[&_text]:cursor-pointer">
        <WordCloud
          data={words}
          width={500}
          height={220}
          font="Inter, sans-serif"
          fontWeight="600"
          fontSize={(word: object) =>
            RANK_FONT_SIZES[(word as CloudWord).rank ?? 2] ?? 18
          }
          rotate={0}
          padding={5}
          fill={(word: { color?: string }) => word.color ?? '#555555'}
          onWordClick={handleWordClick}
        />
      </div>

      <div className="flex gap-4 mt-2 justify-end">
        <span className="flex items-center gap-1 text-[10px] text-zinc-500">
          <span className="inline-block w-2 h-2 rounded-full bg-[#08CAA6]" /> New / Rising
        </span>
        <span className="flex items-center gap-1 text-[10px] text-zinc-500">
          <span className="inline-block w-2 h-2 rounded-full bg-[#93D1BD]" /> Flat
        </span>
        <span className="flex items-center gap-1 text-[10px] text-zinc-500">
          <span className="inline-block w-2 h-2 rounded-full bg-[#555]" /> Falling
        </span>
      </div>

      {popup && <TopicPopup popup={popup} onClose={() => setPopup(null)} />}
    </div>
  );
}

// ─── Export ─────────────────────────────────────────────────────────────────

export function WordCloudSection({ topics, todayDate }: Props) {
  const ecosystemWords = buildCloudData(topics, 'ecosystem', todayDate);
  const enterpriseWords = buildCloudData(topics, 'enterprise', todayDate);

  return (
    <div>
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">
        Trending Topics · Today
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CloudPanel label="🌐 Ecosystem" words={ecosystemWords} />
        <CloudPanel label="🏢 Enterprise AI" words={enterpriseWords} />
      </div>
    </div>
  );
}
