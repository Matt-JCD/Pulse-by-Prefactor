import { fetchSummary } from '@/features/analytics/Analytics.api';
import { Analytics } from '@/features/analytics/Analytics';

export default async function AnalyticsPage() {
  const summary = await fetchSummary();

  return <Analytics initialSummary={summary} />;
}
