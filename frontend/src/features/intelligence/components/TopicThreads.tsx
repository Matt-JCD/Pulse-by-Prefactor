import type { EmergingTopic } from '@/lib/api';
import { TopicCard } from './TopicCard';

interface Props {
  topics: EmergingTopic[];
  todayDate: string; // YYYY-MM-DD in Sydney time
}

function EmptyState() {
  return (
    <div className="bg-[#111113] rounded-lg p-6 border border-zinc-800/60 text-center">
      <p className="text-sm text-zinc-500">
        No topics yet — run the collector to populate.
      </p>
    </div>
  );
}

export function TopicThreads({ topics, todayDate }: Props) {
  const todayTopics = topics.filter((t) => t.date === todayDate);
  const ecosystem = todayTopics
    .filter((t) => t.category === 'ecosystem')
    .sort((a, b) => b.post_count - a.post_count);
  const enterprise = todayTopics
    .filter((t) => t.category === 'enterprise')
    .sort((a, b) => b.post_count - a.post_count);

  const hasAny = ecosystem.length > 0 || enterprise.length > 0;

  return (
    <div>
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">
        Topic Threads
      </p>

      {!hasAny ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ecosystem column */}
          <div>
            <p className="text-xs text-zinc-600 mb-3">🌐 Ecosystem</p>
            {ecosystem.length === 0 ? (
              <p className="text-xs text-zinc-600 italic">
                No ecosystem topics today.
              </p>
            ) : (
              <div className="space-y-3">
                {ecosystem.map((t) => (
                  <TopicCard key={t.id} topic={t} />
                ))}
              </div>
            )}
          </div>

          {/* Enterprise column */}
          <div>
            <p className="text-xs text-zinc-600 mb-3">🏢 Enterprise AI</p>
            {enterprise.length === 0 ? (
              <p className="text-xs text-zinc-600 italic">
                No enterprise topics today.
              </p>
            ) : (
              <div className="space-y-3">
                {enterprise.map((t) => (
                  <TopicCard key={t.id} topic={t} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
