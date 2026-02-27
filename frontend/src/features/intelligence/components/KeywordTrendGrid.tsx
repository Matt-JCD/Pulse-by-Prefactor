'use client';

import React from 'react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { EmergingTopic } from '@/lib/api';

const TOP_N = 5;

interface Props {
  topics: EmergingTopic[];
  todayDate: string; // YYYY-MM-DD
}

interface SparklineData {
  date: string;
  posts: number;
}

interface TopicSpark {
  title: string;
  data: SparklineData[];
  todayCount: number;
  yesterdayCount: number;
  total: number;
  todayRank: number;       // 1-based rank by post_count today
  yesterdayRank: number | null; // null = wasn't present yesterday
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

function buildSparklines(
  topics: EmergingTopic[],
  category: string,
  todayDate: string,
): TopicSpark[] {
  const yesterday = getYesterday(todayDate);
  const allDates = Array.from(new Set(topics.map((t) => t.date))).sort();

  // Group by topic_title, summing post_count per date
  const byTitle = new Map<string, Map<string, number>>();
  for (const t of topics) {
    if (t.category !== category) continue;
    if (!byTitle.has(t.topic_title)) byTitle.set(t.topic_title, new Map());
    const dayMap = byTitle.get(t.topic_title)!;
    dayMap.set(t.date, (dayMap.get(t.date) ?? 0) + t.post_count);
  }

  // First pass — build sparks with raw counts
  type RawSpark = Omit<TopicSpark, 'todayRank' | 'yesterdayRank'>;
  const raw: RawSpark[] = [];

  for (const [title, dayMap] of byTitle) {
    const data = allDates.map((date) => ({
      date,
      posts: dayMap.get(date) ?? 0,
    }));
    const total = Array.from(dayMap.values()).reduce((a, b) => a + b, 0);
    const todayCount = dayMap.get(todayDate) ?? 0;
    const yesterdayCount = dayMap.get(yesterday) ?? 0;
    raw.push({ title, data, todayCount, yesterdayCount, total });
  }

  // Rank by today's post_count
  const todaySorted = [...raw]
    .filter((s) => s.todayCount > 0)
    .sort((a, b) => b.todayCount - a.todayCount);
  const todayRankMap = new Map(todaySorted.map((s, i) => [s.title, i + 1]));

  // Rank by yesterday's post_count
  const yesterdaySorted = [...raw]
    .filter((s) => s.yesterdayCount > 0)
    .sort((a, b) => b.yesterdayCount - a.yesterdayCount);
  const yesterdayRankMap = new Map(yesterdaySorted.map((s, i) => [s.title, i + 1]));

  const sparks: TopicSpark[] = raw.map((s) => ({
    ...s,
    todayRank: todayRankMap.get(s.title) ?? 0,
    yesterdayRank: yesterdayRankMap.get(s.title) ?? null,
  }));

  // Take the top N by TODAY's rank (most active today), left-to-right = rank 1→5
  return sparks
    .filter((s) => s.todayRank > 0)          // only topics active today
    .sort((a, b) => a.todayRank - b.todayRank) // rank 1 first
    .slice(0, TOP_N);
}

// ─── Rank badge ──────────────────────────────────────────────────────────────

function RankBadge({
  todayRank,
  yesterdayRank,
}: {
  todayRank: number;
  yesterdayRank: number | null;
}) {
  if (todayRank === 0) return null;

  let movement: React.ReactNode;

  if (yesterdayRank === null) {
    movement = (
      <span className="text-[10px] font-medium text-aqua">new</span>
    );
  } else {
    const delta = yesterdayRank - todayRank; // positive = climbed, negative = dropped
    if (delta > 0) {
      movement = (
        <span className="text-[10px] font-medium text-aqua tabular-nums">
          ↑{delta} from #{yesterdayRank}
        </span>
      );
    } else if (delta < 0) {
      movement = (
        <span className="text-[10px] font-medium text-red-400 tabular-nums">
          ↓{Math.abs(delta)} from #{yesterdayRank}
        </span>
      );
    } else {
      movement = (
        <span className="text-[10px] text-zinc-600 tabular-nums">
          → #{yesterdayRank}
        </span>
      );
    }
  }

  return (
    <div className="flex items-center gap-1.5 tabular-nums flex-wrap">
      <span className="text-[12px] font-bold text-zinc-100">#{todayRank}</span>
      {movement}
    </div>
  );
}

// ─── Sparkline card ──────────────────────────────────────────────────────────

function Sparkline({
  title,
  data,
  todayRank,
  yesterdayRank,
  color,
}: {
  title: string;
  data: SparklineData[];
  todayRank: number;
  yesterdayRank: number | null;
  color: string;
}) {
  return (
    <div className="bg-[#111113] rounded-lg border border-zinc-800/60 p-3">
      <div style={{ height: 48 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey="posts"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="bg-[#0A0A0B] border border-zinc-800 rounded px-2 py-1 text-[10px] text-zinc-300">
                    {payload[0].payload.date}: {payload[0].value} posts
                  </div>
                ) : null
              }
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Title row */}
      <p className="text-[11px] text-zinc-400 leading-tight line-clamp-2 mt-1.5 mb-1">
        {title}
      </p>

      {/* Rank row */}
      <RankBadge todayRank={todayRank} yesterdayRank={yesterdayRank} />
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function TopicRow({
  label,
  sparks,
  color,
}: {
  label: string;
  sparks: TopicSpark[];
  color: string;
}) {
  if (sparks.length === 0) return null;

  return (
    <div>
      <p className="text-xs text-zinc-600 mb-2">{label}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {sparks.map(({ title, data, todayRank, yesterdayRank }) => (
          <Sparkline
            key={title}
            title={title}
            data={data}
            todayRank={todayRank}
            yesterdayRank={yesterdayRank}
            color={color}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────

export function KeywordTrendGrid({ topics, todayDate }: Props) {
  const ecosystemSparks = buildSparklines(topics, 'ecosystem', todayDate);
  const enterpriseSparks = buildSparklines(topics, 'enterprise', todayDate);

  if (ecosystemSparks.length === 0 && enterpriseSparks.length === 0) {
    return (
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">
          Topic Trends · Top 5 · 14 days
        </p>
        <div className="bg-[#111113] rounded-lg border border-zinc-800/60 p-6 text-center">
          <p className="text-sm text-zinc-600">
            No topics yet — run the collector to populate.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">
        Topic Trends · Top 5 · 14 days
      </p>
      <div className="space-y-5">
        <TopicRow label="🌐 Ecosystem" sparks={ecosystemSparks} color="#08CAA6" />
        <TopicRow label="🏢 Enterprise AI" sparks={enterpriseSparks} color="#93D1BD" />
      </div>
    </div>
  );
}
