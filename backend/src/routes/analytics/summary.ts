import { Router, type Request, type Response } from 'express';
import { supabase } from '../../db/supabase.js';

const router = Router();

/**
 * GET /api/analytics/summary
 * Returns top-level stats per account: total posts, total impressions,
 * average engagement rate, best category, best hour.
 */
router.get('/api/analytics/summary', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.rpc('analytics_summary');

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('[analytics] /summary error:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
