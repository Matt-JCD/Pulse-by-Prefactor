import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../db/supabase.js';
import { getSydneyDate } from '../utils/sydneyDate.js';
import { withRunLog } from '../agents/shared/runLogger.js';
import type { DraftRequest, ComposerPost, Platform } from './types.js';

// 5 time slots in AEST → stored as UTC (AEST = UTC+10).
// 07:00 AEST = 21:00 UTC (prev day), 09:00 = 23:00, 11:00 = 01:00,
// 13:00 = 03:00, 15:00 = 05:00
const SCHEDULED_SLOTS_UTC = ['21:00', '23:00', '01:00', '03:00', '05:00'];

/**
 * Gets the configured model and API key from the config table.
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

// ─── Editorial Memory ─────────────────────────────────────────────────────────
// Loads past feedback from the founder so future drafts learn his voice.
// Each feedback entry is a triplet: original draft → feedback → revised draft.
// These get injected into the system prompt as few-shot examples.

async function loadEditorialMemory(platform: Platform, limit = 15): Promise<string> {
  const { data, error } = await supabase
    .from('composer_feedback')
    .select('original_content, feedback, revised_content, topic_title')
    .eq('platform', platform)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data || data.length === 0) return '';

  const examples = data
    .map((entry, i) => {
      const parts = [`${i + 1}. Original: "${entry.original_content}"`];
      parts.push(`   Feedback: "${entry.feedback}"`);
      if (entry.revised_content) {
        parts.push(`   Revised: "${entry.revised_content}"`);
      }
      return parts.join('\n');
    })
    .join('\n\n');

  return `## Past Editorial Direction
These are corrections the founder has made on previous drafts.
Apply these patterns and preferences to ALL future posts.
The more recent entries (lower numbers) reflect the latest preferences.

${examples}`;
}

// ─── System Prompt ────────────────────────────────────────────────────────────
// Distinct voices for X and LinkedIn, with Prefactor's domain focus,
// controlled controversy, and editorial memory from past feedback.

function getSystemPrompt(platform: Platform, editorialMemory: string): string {
  const baseVoice = `You are writing social media posts for Prefactor, an AI governance company. You are Prefactor the company — not a person.

## The Four Prefactor Voice Pillars

1. **Human Directness** — Talk to people, not personas. Acknowledge reality including limitations. Communicate with humans solving hard problems.
2. **Earned Authority** — Speak from experience. Authority comes from what we ship, not claims we make.
3. **Engineering Clarity** — Logical, specific, unambiguous. If there's a simpler way to say it without losing precision, take it. Don't assume the audience knows the jargon.
4. **Favour Simplicity** — Clarity over complexity. Simplicity isn't lack of depth — it's disciplined thinking. Complexity hides risk; simplicity exposes what matters.

## Prefactor's Domain
Prefactor builds governance and observability infrastructure for AI agent systems.
When a topic touches governance, observability, quality management, or compliance
in enterprise AI — make that connection explicit and specific.
When it doesn't, comment as an informed technical voice without forcing it.

## Point of View
DO NOT just report news. Take a position.
Be mildly provocative — enough that a CTO pauses and thinks "that's an interesting take",
not so much that they dismiss you. Challenge comfortable assumptions.
If everyone would agree with your post, it's too safe. Say something specific and defensible
that not everyone is saying.
The goal is: informed opinion, not press release.

## Rules
- Only use facts from the topic title, summary, keywords, and source links provided — never invent claims.
- Could this be defended to a skeptical CTO?
- Would an engineer know exactly what to do next?
- Is any jargon explained?
- Does it sound human, not like a press release?
- If you removed all adjectives, does the substance still stand?

## Do NOT
- Say "game-changer", "revolutionize", "disrupt", "magic", or "one-click"
- Make vague claims like "Agents need secure access" — be specific
- Use hype language or superlatives
- Invent facts, statistics, or capabilities not in the provided topic data
- Just restate the headline — provide a take, not a summary

## Do
- Be specific: name the product, version, company
- Be direct: say what it does, not what it promises
- Be practical: give engineers something they can act on
- Take a position: what does this mean, and why should someone care?`;

  // Inject editorial memory right after the base voice, before platform-specific rules.
  // This means every draft — auto-draft, manual, and revision — benefits from past feedback.
  const memoryBlock = editorialMemory ? `\n\n${editorialMemory}` : '';

  if (platform === 'twitter') {
    return `${baseVoice}${memoryBlock}

## Platform: X (Twitter)
- HARD LIMIT: 280 characters. Count carefully. Do not exceed 280.
- Voice: Sharp, direct, opinionated. Like a CTO texting a peer after reading the news.
  Not formal. Not corporate. A real person with a real take.
- Lead with the take, not the news. The hook IS the opinion.
- One clear, slightly provocative point per post.
- 2–3 relevant hashtags at the end. Use hashtags connected to the topic and
  Prefactor's domain (e.g. #AIGovernance, #AgentOps, #LLMOps, #EnterpriseAI).
  Hashtags count toward the 280-character limit — keep total under 280.
- No threads. No "here's why this matters" lead-ins.
- If you can't make it interesting in 280 chars, pick a sharper angle.

Produce the tweet text only. No quotes, no labels, no explanation.`;
  }

  // LinkedIn
  return `${baseVoice}${memoryBlock}

## Platform: LinkedIn
- Up to 3,000 characters. Use line breaks for readability.
- Voice: Thoughtful authority. Like a founder writing a short memo to their advisory board.
  More nuanced than X — you have space to build an argument.
- Open with a contrarian or unexpected observation that hooks the reader.
- Build a case: what most people assume → why that's incomplete or wrong → what's actually true.
- End with a specific, actionable implication. What should a VP of Engineering do differently?
- 3–5 relevant hashtags at the end.
- No corporate fluff. No "I'm excited to announce". No filler sentences.

Produce the post text only. No quotes, no labels, no explanation.`;
}

// ─── Topic Curation ───────────────────────────────────────────────────────────
// Instead of just picking the top N topics by post_count, we send ALL today's
// topics to Claude Sonnet in one call. It picks the 5 most relevant topics
// and provides a writing angle for each. The editorial memory is included so
// curation also learns what kind of topics the founder approves/corrects.

interface CuratedTopic {
  topic_title: string;
  angle: string;
  summary: string;
  keyword: string;
  sample_urls: string[];
}

export async function curateTopics(
  topics: Array<{
    topic_title: string;
    summary: string;
    keyword: string;
    sample_urls: string[] | null;
    post_count: number;
  }>,
  editorialMemory: string,
  apiKey: string,
): Promise<CuratedTopic[]> {
  const client = new Anthropic({ apiKey });

  const topicList = topics
    .map((t, i) => `${i + 1}. [${t.keyword}] "${t.topic_title}" (${t.post_count} posts)\n   ${t.summary}`)
    .join('\n');

  const memoryContext = editorialMemory
    ? `\n\nThe founder has given editorial feedback on past posts. Use this to understand what kinds of topics and angles he prefers:\n\n${editorialMemory}`
    : '';

  const systemPrompt = `You are Prefactor's editorial director. Prefactor builds governance and observability infrastructure for AI agent systems.

Your job: select the 5 best topics from today's intelligence feed for social media posts.

Selection criteria:
- 3-4 topics should connect to Prefactor's focus: governance, observability, quality management, compliance, or risk in enterprise agentic workflows. The connection can be indirect — e.g., a new model release matters because it changes what needs to be governed.
- 1-2 topics should be broader AI ecosystem news that an informed technical voice would comment on.
- Prefer topics with genuine news value or industry implications over routine announcements.
- Avoid topics that are too niche to interest a CTO/VP Engineering audience.
- Momentum matters: higher post_count suggests wider relevance.${memoryContext}

For each selected topic, provide a specific WRITING ANGLE — not just "write about this", but the specific take or perspective Prefactor should express. The angle should be slightly contrarian or offer an insight most people aren't saying.

Return valid JSON only. No markdown, no explanation. Format:
[
  {"topic_title": "exact title from the list", "angle": "specific writing angle"},
  ...
]`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: `Today's topics:\n\n${topicList}\n\nSelect 5 topics with writing angles.` }],
  });

  const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
  if (!text) {
    console.error('[composer/curation] Empty response from Sonnet.');
    return [];
  }

  const totalTokens =
    (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);
  console.log(`[composer/curation] Curated topics (${totalTokens} tokens)`);

  try {
    const parsed = JSON.parse(text) as Array<{ topic_title: string; angle: string }>;

    // Match each curated pick back to the full topic data
    const topicMap = new Map(topics.map((t) => [t.topic_title, t]));
    const curated: CuratedTopic[] = [];

    for (const pick of parsed) {
      const full = topicMap.get(pick.topic_title);
      if (full) {
        curated.push({
          topic_title: full.topic_title,
          angle: pick.angle,
          summary: full.summary,
          keyword: full.keyword,
          sample_urls: full.sample_urls || [],
        });
      }
    }

    return curated.slice(0, 5);
  } catch (err) {
    console.error('[composer/curation] Failed to parse curation response:', err);
    return [];
  }
}

// ─── Draft Post ───────────────────────────────────────────────────────────────
// Generates a single draft post using Claude Haiku, saves to the posts table.
// The prompt now includes the writing angle and anti-restatement instructions.

export async function draftPost(request: DraftRequest, scheduledAt?: string): Promise<ComposerPost | null> {
  const config = await getConfig();
  if (!config.apiKey) {
    console.error('[composer/drafting] No Anthropic API key configured.');
    return null;
  }

  const client = new Anthropic({ apiKey: config.apiKey });

  // Load editorial memory so every draft benefits from past feedback
  const editorialMemory = await loadEditorialMemory(request.platform);

  const sourceLinksText = request.sourceLinks && request.sourceLinks.length > 0
    ? `Source links:\n${request.sourceLinks.join('\n')}`
    : 'No source links available.';

  const angleText = request.angle
    ? `Writing angle: ${request.angle}`
    : '';

  const userPrompt = `You're writing for Prefactor. DO NOT restate or summarise the headline.
Provide Prefactor's take — an opinion, not a report.

Topic: ${request.topicTitle}
Summary: ${request.topicSummary}
Keywords: ${request.keywords.join(', ')}
${sourceLinksText}
${angleText}

React to this. What's the implication most people are missing?
What would you say about this to a skeptical CTO over coffee?

Write exactly ONE post. Return only the post text, nothing else.`;

  const response = await client.messages.create({
    model: config.model,
    max_tokens: 512,
    system: getSystemPrompt(request.platform, editorialMemory),
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
  if (!text) {
    console.error('[composer/drafting] Empty response from Haiku.');
    return null;
  }

  const totalTokens =
    (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);
  console.log(`[composer/drafting] Generated draft (${totalTokens} tokens, ${text.length} chars)`);

  const { data, error } = await supabase
    .from('posts')
    .insert({
      platform: request.platform,
      content: text,
      status: 'draft',
      scheduled_at: scheduledAt || null,
      source_topic: request.topicTitle,
      source_keyword: request.keywords[0] || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[composer/drafting] DB insert error:', error.message);
    return null;
  }

  return data as ComposerPost;
}

// ─── Revise Draft ─────────────────────────────────────────────────────────────
// Takes an existing draft + the founder's feedback, generates a revised version.
// Saves the feedback triplet (original → feedback → revised) to composer_feedback
// so the system learns from every correction.

export async function reviseDraft(
  originalContent: string,
  request: DraftRequest,
  feedback: string,
  scheduledAt?: string,
): Promise<ComposerPost | null> {
  const config = await getConfig();
  if (!config.apiKey) {
    console.error('[composer/drafting] No Anthropic API key configured.');
    return null;
  }

  const client = new Anthropic({ apiKey: config.apiKey });
  const editorialMemory = await loadEditorialMemory(request.platform);

  const sourceLinksText = request.sourceLinks && request.sourceLinks.length > 0
    ? `Source links:\n${request.sourceLinks.join('\n')}`
    : '';

  const userPrompt = `You wrote this draft post and the founder wants it revised:

ORIGINAL DRAFT:
${originalContent}

FOUNDER'S FEEDBACK:
${feedback}

TOPIC CONTEXT:
Topic: ${request.topicTitle}
Summary: ${request.topicSummary}
Keywords: ${request.keywords.join(', ')}
${sourceLinksText}

Rewrite the post incorporating the founder's feedback. Keep the same topic.
The feedback tells you exactly what to change — follow it precisely.
Return only the revised post text, nothing else.`;

  const response = await client.messages.create({
    model: config.model,
    max_tokens: 512,
    system: getSystemPrompt(request.platform, editorialMemory),
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
  if (!text) {
    console.error('[composer/drafting] Empty revision response.');
    return null;
  }

  const totalTokens =
    (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);
  console.log(`[composer/drafting] Generated revision (${totalTokens} tokens, ${text.length} chars)`);

  // Save the feedback triplet — this is how the system learns
  const { error: fbError } = await supabase
    .from('composer_feedback')
    .insert({
      original_content: originalContent,
      feedback,
      revised_content: text,
      topic_title: request.topicTitle,
      platform: request.platform,
    });

  if (fbError) {
    console.error('[composer/drafting] Failed to save feedback:', fbError.message);
    // Continue anyway — the revision itself still works
  }

  // Save the revised post
  const { data, error } = await supabase
    .from('posts')
    .insert({
      platform: request.platform,
      content: text,
      status: 'draft',
      scheduled_at: scheduledAt || null,
      source_topic: request.topicTitle,
      source_keyword: request.keywords[0] || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[composer/drafting] DB insert error:', error.message);
    return null;
  }

  return data as ComposerPost;
}

// ─── Auto-Draft Daily Posts ───────────────────────────────────────────────────
// Runs at 6:30am AEST Mon-Fri. Instead of grabbing top 6 by raw post_count,
// it now:
// 1. Loads ALL today's topics
// 2. Loads editorial memory (past feedback)
// 3. Calls curateTopics() → Sonnet picks 5 topics with writing angles
// 4. Drafts 5 posts with Haiku using the curated angles
// 5. Assigns each to a time slot

export async function autoDraftDailyPosts(): Promise<void> {
  await withRunLog('composer-auto-draft', async () => {
    const today = getSydneyDate();
    const config = await getConfig();

    if (!config.apiKey) {
      console.error('[composer/drafting] No Anthropic API key configured.');
      return { llmTokens: 0 };
    }

    // Load ALL today's topics (not just top N)
    const { data: topics, error: topicsError } = await supabase
      .from('emerging_topics')
      .select('topic_title, summary, keyword, sample_urls, post_count')
      .eq('date', today)
      .order('post_count', { ascending: false });

    if (topicsError) {
      console.error('[composer/drafting] Failed loading topics:', topicsError.message);
      return { llmTokens: 0 };
    }

    if (!topics || topics.length === 0) {
      console.log('[composer/drafting] No topics for today. Skipping auto-draft.');
      return { llmTokens: 0 };
    }

    // Check which topics already have drafts today to avoid duplicates
    const { data: existingPosts } = await supabase
      .from('posts')
      .select('source_topic, scheduled_at')
      .eq('platform', 'twitter')
      .gte('created_at', `${today}T00:00:00Z`);

    const draftedTopics = new Set((existingPosts || []).map((p) => p.source_topic));
    const draftedSlots = new Set(
      (existingPosts || []).map((p) => p.scheduled_at?.slice(11, 16)),
    );

    // Filter out already-drafted topics before curation
    const availableTopics = topics.filter((t) => !draftedTopics.has(t.topic_title));

    if (availableTopics.length === 0) {
      console.log('[composer/drafting] All topics already drafted. Skipping.');
      return { llmTokens: 0 };
    }

    // Load editorial memory for curation context
    const editorialMemory = await loadEditorialMemory('twitter');

    // Curate: Sonnet picks the 5 best topics with writing angles
    console.log(`[composer/drafting] Curating from ${availableTopics.length} available topics...`);
    const curated = await curateTopics(availableTopics, editorialMemory, config.apiKey);

    if (curated.length === 0) {
      console.error('[composer/drafting] Curation returned no topics. Falling back to top 5.');
      // Fallback: use top 5 by post_count without angles
      const fallback = availableTopics.slice(0, 5);
      let slotIndex = 0;
      for (const topic of fallback) {
        while (slotIndex < SCHEDULED_SLOTS_UTC.length && draftedSlots.has(SCHEDULED_SLOTS_UTC[slotIndex])) {
          slotIndex++;
        }
        if (slotIndex >= SCHEDULED_SLOTS_UTC.length) break;

        const scheduledAt = `${today}T${SCHEDULED_SLOTS_UTC[slotIndex]}:00Z`;
        slotIndex++;

        await draftPost(
          {
            topicId: '',
            topicTitle: topic.topic_title,
            topicSummary: topic.summary,
            keywords: [topic.keyword],
            sourceLinks: topic.sample_urls || [],
            platform: 'twitter',
          },
          scheduledAt,
        );
      }
      return { llmTokens: 0 };
    }

    // Draft a post for each curated topic, assigning to time slots
    let slotIndex = 0;
    for (const topic of curated) {
      // Find the next available slot
      while (slotIndex < SCHEDULED_SLOTS_UTC.length && draftedSlots.has(SCHEDULED_SLOTS_UTC[slotIndex])) {
        slotIndex++;
      }
      if (slotIndex >= SCHEDULED_SLOTS_UTC.length) break;

      const slotTime = SCHEDULED_SLOTS_UTC[slotIndex];
      const scheduledAt = `${today}T${slotTime}:00Z`;
      slotIndex++;

      console.log(`[composer/drafting] Drafting for slot ${slotTime} UTC: "${topic.topic_title}" (angle: ${topic.angle})`);

      const post = await draftPost(
        {
          topicId: '',
          topicTitle: topic.topic_title,
          topicSummary: topic.summary,
          keywords: [topic.keyword],
          sourceLinks: topic.sample_urls,
          platform: 'twitter',
          angle: topic.angle,
        },
        scheduledAt,
      );

      if (post) {
        console.log(`[composer/drafting] Created draft #${post.id} for ${slotTime} UTC`);
      }
    }

    return { llmTokens: 0 };
  });
}
