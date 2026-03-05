'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AnalyticsPost, CategoryStats, TimeslotStats, AccountSummary } from '@/lib/api';
import {
  fetchAnalyticsPosts,
  fetchCategoryStats,
  fetchTimeslotStats,
  fetchSummary,
} from './Analytics.api';

export type Tab = 'posts' | 'by-category' | 'time-slots' | 'comparison';
export type SortField = 'impressions' | 'likes' | 'published_at';

const ACCOUNT_SLUGS = ['matt_linkedin', 'prefactor_linkedin', 'prefactor_x'] as const;

export function useAnalytics(initialSummary: AccountSummary[]) {
  const [activeTab, setActiveTab] = useState<Tab>('posts');

  // Posts tab
  const [posts, setPosts] = useState<AnalyticsPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [accountFilter, setAccountFilter] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('impressions');

  // By Category tab
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);

  // Time Slots tab
  const [timeslotStats, setTimeslotStats] = useState<TimeslotStats[]>([]);
  const [timeslotLoading, setTimeslotLoading] = useState(false);

  // Summary / Comparison tab
  const [summary, setSummary] = useState<AccountSummary[]>(initialSummary);

  // Fetch posts when tab becomes active or filter changes
  useEffect(() => {
    if (activeTab !== 'posts') return;
    let cancelled = false;
    setPostsLoading(true);
    fetchAnalyticsPosts(accountFilter || undefined)
      .then((data) => { if (!cancelled) setPosts(data); })
      .catch(() => { if (!cancelled) setPosts([]); })
      .finally(() => { if (!cancelled) setPostsLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, accountFilter]);

  // Fetch category stats
  useEffect(() => {
    if (activeTab !== 'by-category') return;
    let cancelled = false;
    setCategoryLoading(true);
    fetchCategoryStats()
      .then((data) => { if (!cancelled) setCategoryStats(data); })
      .catch(() => { if (!cancelled) setCategoryStats([]); })
      .finally(() => { if (!cancelled) setCategoryLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab]);

  // Fetch timeslot stats
  useEffect(() => {
    if (activeTab !== 'time-slots') return;
    let cancelled = false;
    setTimeslotLoading(true);
    fetchTimeslotStats()
      .then((data) => { if (!cancelled) setTimeslotStats(data); })
      .catch(() => { if (!cancelled) setTimeslotStats([]); })
      .finally(() => { if (!cancelled) setTimeslotLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab]);

  // Fetch summary for comparison tab
  useEffect(() => {
    if (activeTab !== 'comparison') return;
    let cancelled = false;
    fetchSummary()
      .then((data) => { if (!cancelled) setSummary(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [activeTab]);

  // Sorted posts
  const sortedPosts = [...posts].sort((a, b) => {
    if (sortField === 'published_at') {
      return new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime();
    }
    return (b[sortField] ?? 0) - (a[sortField] ?? 0);
  });

  const toggleSort = useCallback((field: SortField) => {
    setSortField(field);
  }, []);

  return {
    activeTab,
    setActiveTab,
    // Posts
    sortedPosts,
    postsLoading,
    accountFilter,
    setAccountFilter,
    sortField,
    toggleSort,
    // Category
    categoryStats,
    categoryLoading,
    // Timeslots
    timeslotStats,
    timeslotLoading,
    // Summary
    summary,
    accountSlugs: ACCOUNT_SLUGS,
  };
}
