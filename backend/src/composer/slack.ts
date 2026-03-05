import crypto from 'node:crypto';
import { WebClient } from '@slack/web-api';
import { supabase } from '../db/supabase.js';
import { ACCOUNTS, getPlatformForAccount } from './accounts.js';
import { getSydneyDate, getSydneyDayBounds } from '../utils/sydneyDate.js';
import { reviseDraft } from './drafting.js';
import type { ComposerPost, AccountSlug } from './types.js';
import type { KnownBlock, ActionsBlock, SectionBlock, ContextBlock } from '@slack/web-api';

// ─── Slack Client ────────────────────────────────────────────────────────────

function getSlackClient(): WebClient | null {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.warn('[slack] SLACK_BOT_TOKEN not set. Skipping Slack operations.');
    return null;
  }
  return new WebClient(token);
}

function getChannelId(): string | null {
  return process.env.SLACK_CHANNEL_ID || null;
}

// ─── Daily Digest ────────────────────────────────────────────────────────────
// Sent at 06:30 AEST. Shows all posts scheduled for today that need approval.
// Each post has Approve / Edit / Reject buttons.

export async function sendDailyDigest(): Promise<void> {
  const slack = getSlackClient();
  const channel = getChannelId();
  if (!slack || !channel) return;

  const today = getSydneyDate();
  const { startIso, endIso } = getSydneyDayBounds(today);

  // Auto-submit any drafts for today to pending_approval
  await supabase
    .from('posts')
    .update({ status: 'pending_approval', updated_at: new Date().toISOString() })
    .eq('status', 'draft')
    .gte('scheduled_at', startIso)
    .lt('scheduled_at', endIso);

  // Load all posts for today that need review
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .in('status', ['pending_approval', 'approved'])
    .gte('scheduled_at', startIso)
    .lt('scheduled_at', endIso)
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.error('[slack] Failed to load posts for digest:', error.message);
    return;
  }

  if (!posts || posts.length === 0) {
    await slack.chat.postMessage({
      channel,
      text: `Good morning Matt. No posts scheduled for today.`,
    });
    return;
  }

  const pendingCount = posts.filter((p) => p.status === 'pending_approval').length;

  // Send summary header
  await slack.chat.postMessage({
    channel,
    text: `Good morning Matt. You have ${posts.length} post${posts.length === 1 ? '' : 's'} scheduled today across your accounts. ${pendingCount} need${pendingCount === 1 ? 's' : ''} approval. Review and approve before 07:30 AEST to keep the schedule on track.`,
  });

  // Send one message per post with action buttons
  for (const post of posts as ComposerPost[]) {
    const accountConfig = ACCOUNTS[post.account as AccountSlug];
    const scheduledTime = formatAESTTime(post.scheduled_at);
    const podcastLabel = post.is_podcast ? ' :studio_microphone:' : '';
    const categoryLabel = post.category ? ` · ${post.category}` : '';
    const statusLabel = post.status === 'approved' ? ' :white_check_mark: Approved' : '';

    const blocks: KnownBlock[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${accountConfig?.label || post.account}* · ${scheduledTime}${categoryLabel}${podcastLabel}${statusLabel}`,
        },
      } as SectionBlock,
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `> ${post.content.replace(/\n/g, '\n> ')}`,
        },
      } as SectionBlock,
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `${post.content.length} chars · Post #${post.id}` },
        ],
      } as ContextBlock,
    ];

    // Only show action buttons for posts that still need approval
    if (post.status === 'pending_approval') {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Approve' },
            style: 'primary',
            action_id: `approve_${post.id}`,
            value: String(post.id),
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Edit' },
            action_id: `edit_${post.id}`,
            value: String(post.id),
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Reject' },
            style: 'danger',
            action_id: `reject_${post.id}`,
            value: String(post.id),
          },
        ],
      } as ActionsBlock);
    }

    const result = await slack.chat.postMessage({
      channel,
      text: `${accountConfig?.label || post.account}: ${post.content.slice(0, 100)}...`,
      blocks,
    });

    // Save the Slack message timestamp so we can update it later
    if (result.ts) {
      await supabase
        .from('posts')
        .update({ slack_message_ts: result.ts })
        .eq('id', post.id);
    }
  }
}

// ─── Nudge ───────────────────────────────────────────────────────────────────
// Sent at 07:15 AEST if any posts are still pending approval.

export async function sendNudge(): Promise<void> {
  const slack = getSlackClient();
  const channel = getChannelId();
  if (!slack || !channel) return;

  const today = getSydneyDate();
  const { startIso, endIso } = getSydneyDayBounds(today);

  const { data: pending } = await supabase
    .from('posts')
    .select('id, account, scheduled_at, content')
    .eq('status', 'pending_approval')
    .gte('scheduled_at', startIso)
    .lt('scheduled_at', endIso)
    .order('scheduled_at', { ascending: true });

  if (!pending || pending.length === 0) return;

  const lines = pending.map((p) => {
    const time = formatAESTTime(p.scheduled_at);
    const accountLabel = ACCOUNTS[p.account as AccountSlug]?.label || p.account;
    return `• *${accountLabel}* at ${time} — "${p.content.slice(0, 60)}..."`;
  });

  await slack.chat.postMessage({
    channel,
    text: `Heads up — ${pending.length} post${pending.length === 1 ? '' : 's'} still waiting for approval:\n\n${lines.join('\n')}\n\nFirst post fires at 07:30. Approve above or they'll hold until you do.`,
  });
}

// ─── Handle Slack Actions ────────────────────────────────────────────────────
// Called by the /api/composer/slack/action endpoint when Matt clicks a button.

export async function handleSlackAction(payload: SlackActionPayload): Promise<void> {
  const slack = getSlackClient();
  if (!slack) return;

  for (const action of payload.actions) {
    const postId = parseInt(action.value, 10);
    if (isNaN(postId)) continue;

    if (action.action_id.startsWith('approve_')) {
      // Approve the post
      await supabase
        .from('posts')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
        .eq('status', 'pending_approval');

      // Update the Slack message to show it's approved
      if (payload.message?.ts && payload.channel?.id) {
        await slack.chat.update({
          channel: payload.channel.id,
          ts: payload.message.ts,
          text: `Post #${postId} approved`,
          blocks: updateBlocksWithStatus(payload.message.blocks, 'Approved'),
        });
      }
    } else if (action.action_id.startsWith('edit_')) {
      // Open a Slack modal for editing the post content
      if (!payload.trigger_id) continue;

      const { data: editPost } = await supabase
        .from('posts')
        .select('content, account')
        .eq('id', postId)
        .single();

      if (!editPost) continue;

      const accountLabel = ACCOUNTS[editPost.account as AccountSlug]?.label || editPost.account;

      await slack.views.open({
        trigger_id: payload.trigger_id,
        view: {
          type: 'modal',
          callback_id: `edit_post_${postId}`,
          title: { type: 'plain_text', text: 'Edit Post' },
          submit: { type: 'plain_text', text: 'Save' },
          close: { type: 'plain_text', text: 'Cancel' },
          blocks: [
            {
              type: 'context',
              elements: [
                { type: 'mrkdwn', text: `*${accountLabel}* · Post #${postId}` },
              ],
            },
            {
              type: 'input',
              block_id: 'content_block',
              label: { type: 'plain_text', text: 'Content' },
              element: {
                type: 'plain_text_input',
                action_id: 'content_input',
                multiline: true,
                initial_value: editPost.content,
              },
            },
          ],
        },
      });
    } else if (action.action_id.startsWith('reject_')) {
      // Open a feedback modal so the founder can explain what to change
      if (!payload.trigger_id) continue;

      const { data: rejectPost } = await supabase
        .from('posts')
        .select('content, account')
        .eq('id', postId)
        .single();

      if (!rejectPost) continue;

      const accountLabel = ACCOUNTS[rejectPost.account as AccountSlug]?.label || rejectPost.account;

      // Store channel + message ts in private_metadata so we can update the original message after revision
      const metadata = JSON.stringify({
        channel_id: payload.channel?.id || '',
        message_ts: payload.message?.ts || '',
      });

      await slack.views.open({
        trigger_id: payload.trigger_id,
        view: {
          type: 'modal',
          callback_id: `reject_post_${postId}`,
          private_metadata: metadata,
          title: { type: 'plain_text', text: 'Reject & Revise' },
          submit: { type: 'plain_text', text: 'Reject & Revise' },
          close: { type: 'plain_text', text: 'Cancel' },
          blocks: [
            {
              type: 'context',
              elements: [
                { type: 'mrkdwn', text: `*${accountLabel}* · Post #${postId}` },
              ],
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `> ${rejectPost.content.replace(/\n/g, '\n> ')}`,
              },
            },
            {
              type: 'input',
              block_id: 'feedback_block',
              label: { type: 'plain_text', text: 'What should change?' },
              element: {
                type: 'plain_text_input',
                action_id: 'feedback_input',
                multiline: true,
                placeholder: { type: 'plain_text', text: 'e.g. "No hashtags", "Too long", "Wrong tone"' },
              },
            },
          ],
        },
      });
    }
  }
}

// ─── Slack Signature Verification ────────────────────────────────────────────

export function verifySlackSignature(
  signingSecret: string,
  signature: string,
  timestamp: string,
  body: string,
): boolean {
  const baseString = `v0:${timestamp}:${body}`;
  const hmac = crypto.createHmac('sha256', signingSecret).update(baseString).digest('hex');
  const computed = `v0=${hmac}`;
  const computedBuf = Buffer.from(computed, 'utf8');
  const signatureBuf = Buffer.from(signature, 'utf8');
  if (computedBuf.length !== signatureBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(computedBuf, signatureBuf);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAESTTime(scheduledAt: string | null): string {
  if (!scheduledAt) return 'unscheduled';
  const date = new Date(scheduledAt);
  return date.toLocaleTimeString('en-AU', {
    timeZone: 'Australia/Sydney',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// ─── Handle Slack View Submissions ──────────────────────────────────────────
// Called when the Edit modal's "Save" button is clicked.

export async function handleSlackViewSubmission(payload: SlackViewSubmissionPayload): Promise<void> {
  const callbackId = payload.view?.callback_id;
  if (!callbackId) return;

  // ── Edit submission ──
  if (callbackId.startsWith('edit_post_')) {
    const postId = parseInt(callbackId.replace('edit_post_', ''), 10);
    if (isNaN(postId)) return;

    const content = payload.view?.state?.values
      ?.content_block
      ?.content_input
      ?.value;

    if (!content || content.trim().length === 0) return;

    await supabase
      .from('posts')
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .in('status', ['draft', 'pending_approval']);

    console.log(`[slack] Post #${postId} edited via Slack modal.`);
    return;
  }

  // ── Reject + revise submission ──
  if (callbackId.startsWith('reject_post_')) {
    const postId = parseInt(callbackId.replace('reject_post_', ''), 10);
    if (isNaN(postId)) return;

    const feedback = payload.view?.state?.values
      ?.feedback_block
      ?.feedback_input
      ?.value;

    if (!feedback || feedback.trim().length === 0) return;

    // Load the original post
    const { data: post } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (!post) return;

    const typedPost = post as ComposerPost;

    // Reject the original
    await supabase
      .from('posts')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId);

    // Look up topic context for the revision prompt
    let topicSummary = '';
    if (typedPost.source_topic) {
      const { data: topic } = await supabase
        .from('emerging_topics')
        .select('summary')
        .eq('topic_title', typedPost.source_topic)
        .order('date', { ascending: false })
        .limit(1)
        .single();
      topicSummary = topic?.summary || '';
    }

    // Build a DraftRequest from the stored post data
    const account = typedPost.account;
    const draftRequest = {
      topicId: '',
      topicTitle: typedPost.source_topic || 'untitled',
      topicSummary,
      keywords: typedPost.source_keyword ? [typedPost.source_keyword] : [],
      platform: getPlatformForAccount(account),
      account,
      category: typedPost.category || undefined,
    };

    // Revise: calls AI with original + feedback, saves new draft + feedback triplet
    console.log(`[slack] Revising post #${postId} with feedback: "${feedback.trim()}"`);
    const revisedPost = await reviseDraft(
      typedPost.content,
      draftRequest,
      feedback.trim(),
      typedPost.scheduled_at || undefined,
    );

    // Update the original Slack message
    const meta = parsePrivateMetadata(payload.view?.private_metadata);
    const slack = getSlackClient();

    if (slack && meta.channel_id && meta.message_ts) {
      await slack.chat.update({
        channel: meta.channel_id,
        ts: meta.message_ts,
        text: `Post #${postId} rejected — revision generated`,
        blocks: updateBlocksWithStatus(undefined, 'Rejected'),
      });

      // Post the revised draft as a new message with action buttons
      if (revisedPost) {
        const accountConfig = ACCOUNTS[account];
        const scheduledTime = formatAESTTime(revisedPost.scheduled_at);
        const blocks: KnownBlock[] = [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:arrows_counterclockwise: *Revised* · *${accountConfig?.label || account}* · ${scheduledTime}`,
            },
          } as SectionBlock,
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `> ${revisedPost.content.replace(/\n/g, '\n> ')}`,
            },
          } as SectionBlock,
          {
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `${revisedPost.content.length} chars · Post #${revisedPost.id} · Feedback: "${feedback.trim()}"` },
            ],
          } as ContextBlock,
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Approve' },
                style: 'primary',
                action_id: `approve_${revisedPost.id}`,
                value: String(revisedPost.id),
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Edit' },
                action_id: `edit_${revisedPost.id}`,
                value: String(revisedPost.id),
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Reject' },
                style: 'danger',
                action_id: `reject_${revisedPost.id}`,
                value: String(revisedPost.id),
              },
            ],
          } as ActionsBlock,
        ];

        const result = await slack.chat.postMessage({
          channel: meta.channel_id,
          text: `Revised ${accountConfig?.label || account}: ${revisedPost.content.slice(0, 100)}...`,
          blocks,
        });

        if (result.ts) {
          await supabase
            .from('posts')
            .update({ slack_message_ts: result.ts })
            .eq('id', revisedPost.id);
        }
      }
    }

    console.log(`[slack] Post #${postId} rejected. ${revisedPost ? `Revised as #${revisedPost.id}.` : 'Revision failed.'}`);
  }
}

/** Parse private_metadata JSON from a Slack modal. */
function parsePrivateMetadata(raw?: string): { channel_id: string; message_ts: string } {
  if (!raw) return { channel_id: '', message_ts: '' };
  try {
    const parsed = JSON.parse(raw);
    return { channel_id: parsed.channel_id || '', message_ts: parsed.message_ts || '' };
  } catch {
    return { channel_id: '', message_ts: '' };
  }
}

/** Replace action buttons with a status text block. */
function updateBlocksWithStatus(blocks: KnownBlock[] | undefined, status: string): KnownBlock[] {
  if (!blocks) return [];
  return blocks
    .filter((b) => b.type !== 'actions')
    .concat({
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: status === 'Approved' ? ':white_check_mark: *Approved*' : ':x: *Rejected*' },
      ],
    } as ContextBlock);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SlackViewSubmissionPayload {
  type: 'view_submission';
  view: {
    callback_id: string;
    private_metadata?: string;
    state: {
      values: Record<string, Record<string, { value: string }>>;
    };
  };
  user?: {
    id: string;
    name: string;
  };
}

export interface SlackActionPayload {
  type: string;
  trigger_id: string;
  actions: Array<{
    action_id: string;
    value: string;
    type: string;
  }>;
  message?: {
    ts: string;
    blocks?: KnownBlock[];
  };
  channel?: {
    id: string;
  };
  user?: {
    id: string;
    name: string;
  };
}
