import type { DailyReport, EmergingTopic, RunLogEntry } from '@/lib/api';
import { DashboardHeader } from './components/DashboardHeader';
import { KeywordTrendGrid } from './components/KeywordTrendGrid';
import { SynthesisSection } from './components/SynthesisSection';
import { TopicThreads } from './components/TopicThreads';
import { WordCloudSection } from './components/WordCloudSection';

interface Props {
  report: DailyReport | null;
  topics: EmergingTopic[];   // 14 days — used by both word cloud and trend grid
  runLog: RunLogEntry[];
  todayDate: string; // YYYY-MM-DD in Sydney time
}

export function Intelligence({
  report,
  topics,
  runLog,
  todayDate,
}: Props) {
  return (
    <div className="min-h-screen bg-[#0A0A0B] px-6 py-6 max-w-[1400px] mx-auto">
      {/* Header: date + last run + Run Now */}
      <DashboardHeader runLog={runLog} />

      {/* Section 1: Word Clouds — specific topic titles extracted from posts, click for links */}
      <section className="mb-8">
        <WordCloudSection topics={topics} todayDate={todayDate} />
      </section>

      {/* Section 2: Topic Trend Sparklines — top 5 per category, 14 days, 2+ appearances */}
      <section className="mb-8">
        <KeywordTrendGrid topics={topics} todayDate={todayDate} />
      </section>

      {/* Section 3: Topic Threads — today's topics, two columns */}
      <section className="mb-8">
        <TopicThreads topics={topics} todayDate={todayDate} />
      </section>

      {/* Section 4: Narrative Synthesis */}
      <section>
        <SynthesisSection report={report} />
      </section>
    </div>
  );
}
