import type { ComposerPost, ComposerStats, EmergingTopic } from '@/lib/api';
import { ComposerHeader } from './components/ComposerHeader';
import { PostQueue } from './components/PostQueue';
import { TopicDraftPicker } from './components/TopicDraftPicker';
import { PostHistory } from './components/PostHistory';

interface Props {
  posts: ComposerPost[];
  stats: ComposerStats;
  topics: EmergingTopic[];
  history: ComposerPost[];
}

export function Composer({ posts, stats, topics, history }: Props) {
  return (
    <div className="min-h-screen bg-[#0A0A0B] px-6 py-6 max-w-[1400px] mx-auto">
      {/* Header: stats bar with X/Twitter counter */}
      <ComposerHeader stats={stats} />

      {/* Review queue: drafts + scheduled posts */}
      <PostQueue posts={posts} />

      {/* Draft from today's intelligence topics */}
      <TopicDraftPicker topics={topics} />

      {/* Status tracking: published, failed, rejected */}
      <PostHistory posts={history} />
    </div>
  );
}
