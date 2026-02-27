import cron from 'node-cron';
import { hnCollector } from './agents/hnCollector.js';
import { redditCollector } from './agents/redditCollector.js';
import { twitterCollector } from './agents/twitterCollector.js';
import { synthesizer } from './agents/synthesizer.js';
import { getSydneyDayOfWeek } from './utils/sydneyDate.js';

export function startScheduler(): void {
  // 6am AEST, Monday–Friday only.
  // node-cron handles DST automatically via timezone — always fires at 6am local time.
  // Monday runs cover Friday→weekend content (collectors already look back 7 days).
  cron.schedule(
    '0 6 * * 1-5',
    async () => {
      const isMonday = getSydneyDayOfWeek() === 1;
      const label = isMonday ? 'Monday (weekend roundup)' : 'Daily';
      console.log(`[scheduler] ── ${label} run starting ──`);
      try {
        console.log('[scheduler] Step 1/4: HN collector');
        await hnCollector(isMonday);

        console.log('[scheduler] Step 2/4: Reddit collector');
        await redditCollector(isMonday);

        console.log('[scheduler] Step 3/4: Twitter collector');
        await twitterCollector(isMonday);

        console.log('[scheduler] Step 4/4: Synthesizer');
        await synthesizer();

        console.log(`[scheduler] ── ${label} run complete ──`);
      } catch (err) {
        console.error('[scheduler] Run failed:', err);
      }
    },
    { timezone: 'Australia/Sydney' },
  );

  console.log('[scheduler] Cron registered: 6am AEST, Monday–Friday (Australia/Sydney)');
}
