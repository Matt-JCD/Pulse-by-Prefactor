import { Router, type Request, type Response } from 'express';
import { supabase } from '../../db/supabase.js';

const router = Router();

/**
 * GET /api/analytics/by-category
 * Returns average engagement per category per account.
 */
router.get('/api/analytics/by-category', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.rpc('analytics_by_category');

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('[analytics] /by-category error:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
