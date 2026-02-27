import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { hnCollector } from '../agents/hnCollector.js';
import { redditCollector } from '../agents/redditCollector.js';
import { twitterCollector } from '../agents/twitterCollector.js';
import { synthesizer } from '../agents/synthesizer.js';
import { getSydneyDate, getSydneyDateOffset } from '../utils/sydneyDate.js';

const router = Router();

// GET /api/intelligence/today — today's daily_report
router.get('/api/intelligence/today', async (_req, res) => {
  const today = getSydneyDate();

  const { data, error } = await supabase
    .from('daily_report')
    .select('*')
    .eq('date', today)
    .single();

  if (error && error.code !== 'PGRST116') {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data || { date: today, status: 'no_report_yet' });
});

// GET /api/intelligence/report/:date — report for a specific date
router.get('/api/intelligence/report/:date', async (req, res) => {
  const { date } = req.params;

  const { data, error } = await supabase
    .from('daily_report')
    .select('*')
    .eq('date', date)
    .single();

  if (error) {
    res.status(404).json({ error: 'No report for this date' });
    return;
  }

  res.json(data);
});

// GET /api/intelligence/keywords — keyword_signals for date range
router.get('/api/intelligence/keywords', async (req, res) => {
  const days = parseInt(req.query.days as string) || 7;
  const since = getSydneyDateOffset(-days);

  const { data, error } = await supabase
    .from('keyword_signals')
    .select('*')
    .gte('date', since)
    .order('date', { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

// GET /api/intelligence/topics — emerging_topics for date range
router.get('/api/intelligence/topics', async (req, res) => {
  const days = parseInt(req.query.days as string) || 7;
  const since = getSydneyDateOffset(-days);

  const { data, error } = await supabase
    .from('emerging_topics')
    .select('*')
    .gte('date', since)
    .order('date', { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

// GET /api/intelligence/run-log — agent run history
router.get('/api/intelligence/run-log', async (_req, res) => {
  const { data, error } = await supabase
    .from('run_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

// POST /api/intelligence/trigger-run — manually trigger collectors
router.post('/api/intelligence/trigger-run', async (req, res) => {
  const platform = req.body?.platform as string | undefined;

  res.json({ status: 'started', platform: platform || 'all' });

  // Run collectors in the background (don't block the response)
  try {
    if (!platform || platform === 'hackernews') {
      console.log('[trigger] Starting HN collector...');
      await hnCollector();
    }
    if (!platform || platform === 'reddit') {
      console.log('[trigger] Starting Reddit collector...');
      await redditCollector();
    }
    if (!platform || platform === 'twitter') {
      console.log('[trigger] Starting Twitter collector...');
      await twitterCollector();
    }
    if (!platform || platform === 'synthesizer') {
      console.log('[trigger] Starting synthesizer...');
      await synthesizer();
    }
  } catch (err) {
    console.error('[trigger] Collector error:', err);
  }
});

export default router;
