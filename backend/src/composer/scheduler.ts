import cron from 'node-cron';
import { supabase } from '../db/supabase.js';
import { publishPost } from './index.js';
import { autoDraftDailyPosts } from './drafting.js';
import type { ComposerPost } from './types.js';

/**
 * Starts the composer's own cron jobs — fully independent of the intelligence pipeline.
 *
 * Two jobs:
 * 1. Auto-draft: 6:30am AEST Mon–Fri. Reads today's emerging_topics and drafts 6 posts.
 *    Intelligence runs at 6am, so topics should be in the DB by 6:30.
 * 2. Publisher: Hourly 6am–11pm AEST. Publishes approved posts whose scheduled_at has arrived.
 */
export function startComposerScheduler(): void {
  // ── Auto-draft: 6:30am AEST, Mon–Fri ──
  cron.schedule(
    '30 6 * * 1-5',
    async () => {
      console.log('[composer-scheduler] Auto-draft starting...');
      try {
        await autoDraftDailyPosts();
        console.log('[composer-scheduler] Auto-draft complete.');
      } catch (err) {
        console.error('[composer-scheduler] Auto-draft failed:', err instanceof Error ? err.message : err);
      }
    },
    { timezone: 'Australia/Sydney' },
  );

  // ── Publisher: hourly 6am–11pm AEST ──
  cron.schedule(
    '0 6-23 * * *',
    async () => {
      try {
        const now = new Date().toISOString();

        const { data: duePosts, error } = await supabase
          .from('posts')
          .select('*')
          .eq('status', 'scheduled')
          .lte('scheduled_at', now)
          .order('scheduled_at', { ascending: true });

        if (error) {
          console.error('[composer-scheduler] Publisher query error:', error.message);
          return;
        }

        if (!duePosts || duePosts.length === 0) return;

        console.log(`[composer-scheduler] ${duePosts.length} post(s) due for publishing.`);

        for (const post of duePosts as ComposerPost[]) {
          await publishPost(post);
        }
      } catch (err) {
        console.error('[composer-scheduler] Publisher error:', err instanceof Error ? err.message : err);
      }
    },
    { timezone: 'Australia/Sydney' },
  );

  console.log('[composer-scheduler] Crons registered: auto-draft 6:30am + publisher hourly 6am–11pm AEST.');
}
