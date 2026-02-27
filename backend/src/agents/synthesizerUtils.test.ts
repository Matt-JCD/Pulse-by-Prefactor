import { describe, expect, it } from 'vitest';
import {
  extractFirstTextContent,
  sentimentDirection,
  sentimentLabel,
  sentimentToScore,
  urlLabel,
} from './synthesizerUtils.js';

describe('synthesizerUtils', () => {
  it('maps sentiment to score', () => {
    expect(sentimentToScore('positive')).toBe(1);
    expect(sentimentToScore('negative')).toBe(-1);
    expect(sentimentToScore('neutral')).toBe(0);
    expect(sentimentToScore('mixed')).toBe(0);
    expect(sentimentToScore('unknown')).toBe(0);
  });

  it('computes sentiment direction with threshold handling', () => {
    expect(sentimentDirection(0.2, null)).toEqual({ direction: '->', label: 'flat', delta: 0 });
    expect(sentimentDirection(0.31, 0.2)).toEqual({ direction: '^', label: 'improving', delta: 0.11 });
    expect(sentimentDirection(-0.2, -0.1)).toEqual({ direction: 'v', label: 'softening', delta: -0.1 });
    expect(sentimentDirection(0.25, 0.21)).toEqual({ direction: '->', label: 'flat', delta: 0.04 });
  });

  it('maps sentiment labels', () => {
    expect(sentimentLabel(0.31)).toBe('Positive');
    expect(sentimentLabel(0.3)).toBe('Neutral');
    expect(sentimentLabel(-0.09)).toBe('Neutral');
    expect(sentimentLabel(-0.1)).toBe('Cautious');
  });

  it('maps URL labels', () => {
    expect(urlLabel('https://reddit.com/r/ai/comments/abc')).toBe('Reddit thread');
    expect(urlLabel('https://news.ycombinator.com/item?id=1')).toBe('HN thread');
    expect(urlLabel('https://x.com/user/status/1')).toBe('Twitter thread');
    expect(urlLabel('https://example.com')).toBe('Read article');
  });

  it('extracts first text block safely', () => {
    expect(extractFirstTextContent(undefined)).toBe('');
    expect(extractFirstTextContent([])).toBe('');
    expect(extractFirstTextContent([{ type: 'tool_use' }])).toBe('');
    expect(extractFirstTextContent([{ type: 'text', text: '  hello  ' }])).toBe('hello');
    expect(
      extractFirstTextContent([
        { type: 'tool_use' },
        { type: 'text', text: 'first' },
        { type: 'text', text: 'second' },
      ]),
    ).toBe('first');
  });
});
