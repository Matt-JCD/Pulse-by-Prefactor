import { Router } from 'express';
import postsRouter from './posts.js';
import byCategoryRouter from './byCategory.js';
import byTimeslotRouter from './byTimeslot.js';
import summaryRouter from './summary.js';
import { refreshEngagement } from '../../scheduler/engagement.js';

const router = Router();

router.use(postsRouter);
router.use(byCategoryRouter);
router.use(byTimeslotRouter);
router.use(summaryRouter);

// Manual trigger for engagement refresh — useful for debugging.
router.post('/api/analytics/refresh', async (_req, res) => {
  refreshEngagement().catch((err) =>
    console.error('[analytics] Manual refresh error:', err instanceof Error ? err.message : err),
  );
  res.json({ ok: true, message: 'Engagement refresh started.' });
});

export default router;
