import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../db/supabase.js';
import { getSydneyDate, getSydneyDateOffset } from '../utils/sydneyDate.js';
import { withRunLog } from './shared/runLogger.js';
import {
  extractFirstTextContent,
  sentimentDirection,
  sentimentLabel,
  sentimentToScore,
  urlLabel,
} from './synthesizerUtils.js';

// --- API key helper ---

async function getApiKey(): Promise<string> {
  const { data } = await supabase
    .from('config')
    .select('anthropic_api_key')
    .eq('id', 1)
    .single();
  return data?.anthropic_api_key || process.env.ANTHROPIC_API_KEY || '';
}

// --- Main synthesizer ---

export async function synthesizer() {
  return withRunLog('synthesizer', async () => {
    const today = getSydneyDate();
    const yesterday = getSydneyDateOffset(-1);

    const apiKey = await getApiKey();
    if (!apiKey) throw new Error('No Anthropic API key configured. Add it in Admin -> Config.');

    const client = new Anthropic({ apiKey });

    // --- Load today's signals and topics ---
    const { data: signals, error: signalsError } = await supabase
      .from('keyword_signals')
      .select('keyword, sentiment, post_count, category')
      .eq('date', today);
    if (signalsError) throw new Error(`Failed loading keyword_signals: ${signalsError.message}`);

    const { data: topics, error: topicsError } = await supabase
      .from('emerging_topics')
      .select('keyword, topic_title, summary, post_count, sample_urls, category')
      .eq('date', today);
    if (topicsError) throw new Error(`Failed loading emerging_topics: ${topicsError.message}`);

    if (!signals || signals.length === 0) {
      console.log('[synthesizer] No signals found for today. Has the collector run yet?');
      return { llmTokens: 0 };
    }

    // --- Split by track ---
    const ecosystemSignals = signals.filter((s) => s.category === 'ecosystem');
    const enterpriseSignals = signals.filter((s) => s.category === 'enterprise');
    const ecosystemTopics = (topics || []).filter((t) => t.category === 'ecosystem');
    const enterpriseTopics = (topics || []).filter((t) => t.category === 'enterprise');

    // --- Calculate today's sentiment score ---
    const allScores = signals.map((s) => sentimentToScore(s.sentiment));
    const todayScore = allScores.length > 0
      ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 1000) / 1000
      : 0;

    // --- Load yesterday's score for direction comparison ---
    const { data: yesterdayReport, error: yesterdayError } = await supabase
      .from('daily_report')
      .select('sentiment_score')
      .eq('date', yesterday)
      .single();
    if (yesterdayError && yesterdayError.code !== 'PGRST116') {
      throw new Error(`Failed loading yesterday report: ${yesterdayError.message}`);
    }

    const direction = sentimentDirection(todayScore, yesterdayReport?.sentiment_score ?? null);
    const label = sentimentLabel(todayScore);

    // Format topics: embed URL labels so Sonnet uses the required anchor text
    const formatTopics = (topicList: typeof ecosystemTopics) =>
      topicList
        .map((t) => {
          const urls = (t.sample_urls || []).slice(0, 2);
          const linkLine = urls.map((u: string) => `${u} [label: ${urlLabel(u)}]`).join(' | ');
          return `- ${t.topic_title} (${t.post_count} posts)\n  Links: ${linkLine || 'none'}\n  ${t.summary}`;
        })
        .join('\n') || 'None identified today.';

    // --- Ecosystem synthesis (Sonnet call 1) ---
    const ecosystemPrompt = `You are writing a daily AI industry digest for a technical founding team. Report facts - do not give strategic advice or tell the reader what they should do.

Today's ecosystem signals (developer tools, models, open source, coding assistants):

Signal volume:
${ecosystemSignals.map((s) => `- ${s.keyword}: ${s.post_count} posts, ${s.sentiment}`).join('\n') || 'No signals today.'}

Emerging topics with source URLs:
${formatTopics(ecosystemTopics)}

Output format - write each topic as a Slack-formatted entry. Use this exact structure:

*Topic title* · N posts
<URL1|LABEL1> · <URL2|LABEL2>
One or two sentences of factual summary. Name the products, people, or events involved.

Use the [label: ...] provided for each URL as the anchor text - e.g. [label: Reddit thread] -> <https://reddit.com/...|Reddit thread>
If only one URL is available, show one link. If no URLs, skip the topic.

Rules:
- Slack bold: *text* (single asterisks only)
- Links: <https://example.com|anchor text>
- Skip topics with no URLs
- No conclusions or recommendations
- Maximum 4 topics
- Plain, direct language`;

    console.log('[synthesizer] Calling Sonnet for ecosystem synthesis...');
    const ecosystemResponse = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: ecosystemPrompt }],
    });
    const ecosystemSynthesis = extractFirstTextContent(ecosystemResponse.content);

    // --- Enterprise synthesis (Sonnet call 2) ---
    const enterprisePrompt = `You are writing a daily AI industry digest for a technical founding team. Report facts - do not give strategic advice or tell the reader what they should do.

Today's enterprise AI signals (governance, compliance, deployment, shadow AI, observability):

Signal volume:
${enterpriseSignals.map((s) => `- ${s.keyword}: ${s.post_count} posts, ${s.sentiment}`).join('\n') || 'No signals today.'}

Emerging topics with source URLs:
${formatTopics(enterpriseTopics)}

Output format - write each topic as a Slack-formatted entry. Use this exact structure:

*Topic title* · N posts
<URL1|LABEL1> · <URL2|LABEL2>
One or two sentences of factual summary. Name the products, companies, regulations, or incidents involved.

Use the [label: ...] provided for each URL as the anchor text - e.g. [label: Reddit thread] -> <https://reddit.com/...|Reddit thread>
If only one URL is available, show one link. If no URLs, skip the topic.

Rules:
- Slack bold: *text* (single asterisks only)
- Links: <https://example.com|anchor text>
- Skip topics with no URLs
- No conclusions or recommendations
- Maximum 4 topics
- Plain, direct language`;

    console.log('[synthesizer] Calling Sonnet for enterprise synthesis...');
    const enterpriseResponse = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: enterprisePrompt }],
    });
    const enterpriseSynthesis = extractFirstTextContent(enterpriseResponse.content);

    const totalTokens =
      (ecosystemResponse.usage?.input_tokens ?? 0) +
      (ecosystemResponse.usage?.output_tokens ?? 0) +
      (enterpriseResponse.usage?.input_tokens ?? 0) +
      (enterpriseResponse.usage?.output_tokens ?? 0);

    // --- Build Slack post ---
    const slackText =
      `*Ecosystem*\n${ecosystemSynthesis}\n\n` +
      `*Enterprise AI*\n${enterpriseSynthesis}\n\n` +
      `*Sentiment* - ${label} · ${direction.direction} ${direction.label} vs yesterday`;

    // --- Write to DB (always, even if Slack fails) ---
    const { error: dbError } = await supabase
      .from('daily_report')
      .upsert(
        {
          date: today,
          ecosystem_synthesis: ecosystemSynthesis,
          enterprise_synthesis: enterpriseSynthesis,
          sentiment_score: todayScore,
          sentiment_direction: direction.direction,
          sentiment_label: label,
          slack_post_text: slackText,
        },
        { onConflict: 'date' },
      );

    if (dbError) {
      console.error('[synthesizer] DB write error:', dbError.message);
    } else {
      console.log('[synthesizer] Written to daily_report.');
    }

    // --- Post to Slack ---
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const slackRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: slackText }),
        });

        if (slackRes.ok) {
          await supabase
            .from('daily_report')
            .update({ posted_at: new Date().toISOString() })
            .eq('date', today);
          console.log('[synthesizer] Posted to Slack.');
        } else {
          console.warn('[synthesizer] Slack post failed:', slackRes.status, await slackRes.text());
        }
      } catch (err) {
        console.warn('[synthesizer] Slack webhook error:', err);
      }
    } else {
      console.log('[synthesizer] No SLACK_WEBHOOK_URL set - skipping Slack post.');
    }

    console.log(`[synthesizer] Sentiment: ${todayScore} (${label}) ${direction.direction} ${direction.label}`);
    return { llmTokens: totalTokens };
  });
}
