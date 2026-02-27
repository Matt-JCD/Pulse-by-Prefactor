import {
  fetchRunLog,
  fetchTodayReport,
  fetchTopics,
} from '@/features/intelligence/Intelligence.api';
import { Intelligence } from '@/features/intelligence/Intelligence';
import { getSydneyDate } from '@/lib/sydneyDate';

export default async function IntelligencePage() {
  const todayDate = getSydneyDate();

  const [report, topics, runLog] = await Promise.all([
    fetchTodayReport(),
    fetchTopics(14), // 14 days covers both word cloud (today+yesterday) and trend grid (14-day sparks)
    fetchRunLog(),
  ]);

  return (
    <Intelligence
      report={report}
      topics={topics}
      runLog={runLog}
      todayDate={todayDate}
    />
  );
}
