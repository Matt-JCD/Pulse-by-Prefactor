import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../../db/supabase.js';

interface KeywordSignal {
  keyword: string;
  post_count: number;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
}

interface EmergingTopic {
  keyword: string;
  topic_title: string;
  summary: string;
  post_count: number;
  sample_urls: string[];
}

export interface ExtractionResult {
  keyword_signals: KeywordSignal[];
  emerging_topics: EmergingTopic[];
  llmTokens: number;
  category: string;
}

/**
 * Gets the configured LLM model and API key from the config table.
 * Falls back to env var if no key stored in DB.
 */
async function getConfig() {
  const { data } = await supabase
    .from('config')
    .select('llm_model, anthropic_api_key')
    .eq('id', 1)
    .single();

  return {
    model: data?.llm_model || 'claude-haiku-4-5-20251001',
    apiKey: data?.anthropic_api_key || process.env.ANTHROPIC_API_KEY || '',
  };
}

/**
 * Sends collected posts to Haiku for keyword signal extraction
 * and emerging topic identification. One LLM call per platform per day.
 */
export async function extractWithHaiku(
  platform: string,
  posts: { title: string; url: string; body?: string; score?: number }[],
  keywords: string[],
  category: string = 'ecosystem',
): Promise<ExtractionResult> {
  const config = await getConfig();

  if (!config.apiKey) {
    throw new Error('No Anthropic API key configured. Add it in Admin → Config.');
  }

  const client = new Anthropic({ apiKey: config.apiKey });

  // Cap at 80 posts — give more body text so the model has content to extract specifics from
  const postsJson = JSON.stringify(
    posts.slice(0, 80).map((p) => ({
      title: p.title,
      url: p.url,
      body: p.body?.slice(0, 350) || '',
      score: p.score,
    })),
  );

  const context = category === 'enterprise'
    ? 'enterprise AI adoption, governance, compliance, and organisational deployment challenges'
    : 'AI tools, models, and developer ecosystem';

  const prompt = `You are analyzing ${platform} posts about ${context}.

Posts: ${postsJson}
Keywords being tracked: ${JSON.stringify(keywords)}

Your job is to identify what people are ACTUALLY talking about inside these posts — not what category they belong to.

Read the post titles and bodies carefully. Look for the specific thing that keeps coming up: a named product, a specific release, a bug or outage, a particular debate, a person or company being discussed, a feature that launched, a complaint about a concrete thing.

Group related posts into topics. For each topic:

topic_title: Name the SPECIFIC thing being discussed. This must be something you extracted from reading the posts — not something you could have guessed from the keyword alone.
- BAD: "LangSmith adoption in enterprise" (that's just restating the keyword)
- BAD: "MCP ecosystem growth" (too vague, could describe any week)
- GOOD: "LangSmith 0.1.83 breaks trace streaming for long-running agents"
- GOOD: "Anthropic ships MCP filesystem server with sandboxed write access"
- GOOD: "Cursor AI editor raises $900M Series B"
- GOOD: "OpenAI's GPT-4o rate limits cut by 80% for free tier users"
If you cannot find a specific thing from the content, do not create a topic.

summary: Describe what people are actually saying about this specific thing. Include any concrete details from the posts — version numbers, company names, specific features, error messages, outcomes people reported, opinions expressed. No generalisations. 2 sentences maximum.

Return JSON only. Maximum 8 emerging_topics total.
{
  "keyword_signals": [
    {"keyword": "string", "post_count": number, "sentiment": "positive|neutral|negative|mixed"}
  ],
  "emerging_topics": [
    {
      "keyword": "string",
      "topic_title": "string",
      "summary": "string",
      "post_count": number,
      "sample_urls": ["string"]
    }
  ]
}`;

  const response = await client.messages.create({
    model: config.model,
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '';

  // Parse JSON from response (handle markdown code fences)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Haiku did not return valid JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    keyword_signals: KeywordSignal[];
    emerging_topics: EmergingTopic[];
  };

  const totalTokens =
    (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

  return {
    keyword_signals: parsed.keyword_signals || [],
    emerging_topics: parsed.emerging_topics || [],
    llmTokens: totalTokens,
    category,
  };
}
