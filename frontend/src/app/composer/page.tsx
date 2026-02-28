import {
  fetchQueue,
  fetchStats,
  fetchTodayTopics,
  fetchHistory,
} from '@/features/composer/Composer.api';
import { Composer } from '@/features/composer/Composer';

export default async function ComposerPage() {
  const [posts, stats, topics, history] = await Promise.all([
    fetchQueue(),
    fetchStats(),
    fetchTodayTopics(),
    fetchHistory(),
  ]);

  return (
    <Composer posts={posts} stats={stats} topics={topics} history={history} />
  );
}
