import { api } from '@/lib/api';
import type { AnalyticsPost, CategoryStats, TimeslotStats, AccountSummary } from '@/lib/api';

export async function fetchAnalyticsPosts(account?: string): Promise<AnalyticsPost[]> {
  return api.analytics.posts(account);
}

export async function fetchCategoryStats(): Promise<CategoryStats[]> {
  return api.analytics.byCategory();
}

export async function fetchTimeslotStats(): Promise<TimeslotStats[]> {
  return api.analytics.byTimeslot();
}

export async function fetchSummary(): Promise<AccountSummary[]> {
  return api.analytics.summary();
}
