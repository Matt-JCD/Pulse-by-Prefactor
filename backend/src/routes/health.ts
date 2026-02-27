import { Router } from 'express';
import { supabase } from '../db/supabase.js';

const router = Router();

router.get('/api/health', async (_req, res) => {
  try {
    // Simple query to verify Supabase connection is alive
    const { error } = await supabase.from('config').select('id').limit(1);

    if (error) {
      res.status(503).json({ status: 'error', db: 'disconnected', message: error.message });
      return;
    }

    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(503).json({ status: 'error', db: 'disconnected', message });
  }
});

export default router;
