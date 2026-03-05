import { Router, type Request, type Response } from 'express';
import { supabase } from '../../db/supabase.js';

const router = Router();

/**
 * GET /api/analytics/by-timeslot
 * Returns average impressions by hour of day (AEST) per account.
 */
router.get('/api/analytics/by-timeslot', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.rpc('analytics_by_timeslot');

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('[analytics] /by-timeslot error:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
