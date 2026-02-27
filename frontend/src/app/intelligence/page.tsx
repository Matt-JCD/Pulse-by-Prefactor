import {
  fetchKeywordSignals,
  fetchRunLog,
  fetchTodayReport,
  fetchTopics,
} from '@/features/intelligence/Intelligence.api';
import { Intelligence } from '@/features/intelligence/Intelligence';

function getSydneyDate(): string {
  // en-CA locale produces YYYY-MM-DD format, which matches the backend DATE columns
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default async function IntelligencePage() {
  const todayDate = getSydneyDate();

  const [report, signals, topics, runLog] = await Promise.all([
    fetchTodayReport(),
    fetchKeywordSignals(14),
    fetchTopics(14), // 14 days covers both word cloud (today+yesterday) and trend grid (14-day sparks)
    fetchRunLog(),
  ]);

  return (
    <Intelligence
      report={report}
      signals={signals}
      topics={topics}
      runLog={runLog}
      todayDate={todayDate}
    />
  );
}
