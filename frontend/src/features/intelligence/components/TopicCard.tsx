import type { EmergingTopic } from '@/lib/api';

function urlLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    if (host.includes('reddit.com')) return 'Reddit thread';
    if (host.includes('ycombinator.com') || host.includes('news.ycombinator'))
      return 'HN thread';
    if (host.includes('twitter.com') || host.includes('x.com'))
      return 'Twitter thread';
    return 'Read article';
  } catch {
    return 'Read article';
  }
}

function platformBadge(platform: string) {
  const map: Record<string, string> = {
    hackernews: 'HN',
    reddit: 'Reddit',
    twitter: 'Twitter',
  };
  return map[platform.toLowerCase()] ?? platform;
}

interface Props {
  topic: EmergingTopic;
}

export function TopicCard({ topic }: Props) {
  const isEcosystem = topic.category === 'ecosystem';
  const urls = (topic.sample_urls ?? []).slice(0, 2);

  return (
    <div className="bg-[#111113] rounded-lg p-4 border border-zinc-800/60">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-sm font-semibold text-zinc-100 leading-snug">
          {topic.topic_title}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              isEcosystem
                ? 'bg-aqua/10 text-aqua'
                : 'bg-sage/10 text-sage'
            }`}
          >
            {platformBadge(topic.platform)}
          </span>
          <span className="text-[10px] text-zinc-600">
            {topic.post_count} posts
          </span>
        </div>
      </div>

      <p className="text-sm text-zinc-400 leading-relaxed mb-3">
        {topic.summary}
      </p>

      {urls.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {urls.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-aqua hover:underline"
            >
              {urlLabel(url)}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
