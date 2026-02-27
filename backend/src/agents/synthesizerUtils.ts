export function sentimentToScore(sentiment: string): number {
  switch (sentiment) {
    case 'positive': return 1.0;
    case 'negative': return -1.0;
    case 'neutral': return 0.0;
    case 'mixed': return 0.0;
    default: return 0.0;
  }
}

export function sentimentDirection(
  todayScore: number,
  yesterdayScore: number | null,
): { direction: string; label: string; delta: number } {
  if (yesterdayScore === null) {
    return { direction: '->', label: 'flat', delta: 0 };
  }

  const delta = Math.round((todayScore - yesterdayScore) * 100) / 100;
  if (delta > 0.05) return { direction: '^', label: 'improving', delta };
  if (delta < -0.05) return { direction: 'v', label: 'softening', delta };
  return { direction: '->', label: 'flat', delta };
}

export function sentimentLabel(score: number): string {
  if (score > 0.3) return 'Positive';
  if (score > -0.1) return 'Neutral';
  return 'Cautious';
}

export function urlLabel(url: string): string {
  if (url.includes('reddit.com')) return 'Reddit thread';
  if (url.includes('news.ycombinator.com') || url.includes('ycombinator.com/item')) return 'HN thread';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'Twitter thread';
  return 'Read article';
}

export function extractFirstTextContent(
  content: Array<{ type: string; text?: string }> | undefined,
): string {
  if (!content || content.length === 0) return '';
  const textBlock = content.find((block) => block.type === 'text' && typeof block.text === 'string');
  return textBlock?.text?.trim() || '';
}
