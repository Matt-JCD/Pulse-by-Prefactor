import { Router, type Request, type Response } from 'express';
import { supabase } from '../../db/supabase.js';

const router = Router();

/**
 * GET /api/analytics/posts
 * Returns all published posts with engagement data.
 * Optional ?account= filter. Ordered by published_at DESC.
 */
router.get('/api/analytics/posts', async (req: Request, res: Response) => {
  try {
    const account = req.query.account as string | undefined;

    let query = supabase
      .from('posts')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (account) {
      query = query.eq('account', account);
    }

    const { data, error } = await query;

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('[analytics] /posts error:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
