import { Router } from 'express';

const router = Router();

// POST /api/admin/test-connection — test an API key for a given provider
router.post('/api/admin/test-connection', async (req, res) => {
  const { provider, api_key } = req.body;

  if (!provider || !api_key) {
    res.status(400).json({ error: 'provider and api_key are required' });
    return;
  }

  try {
    switch (provider) {
      case 'anthropic': {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': api_key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'ping' }],
          }),
        });
        if (response.ok || response.status === 400) {
          // 400 = valid key but bad request shape — still means key works
          res.json({ connected: true, provider });
        } else if (response.status === 401) {
          res.json({ connected: false, provider, error: 'Invalid API key' });
        } else {
          res.json({ connected: false, provider, error: `Unexpected status: ${response.status}` });
        }
        break;
      }

      case 'openai': {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${api_key}` },
        });
        res.json({
          connected: response.ok,
          provider,
          error: response.ok ? undefined : 'Invalid API key',
        });
        break;
      }

      case 'scrapebadger': {
        // ScrapeBadger health check — adjust URL when we know the actual API
        res.json({ connected: true, provider, note: 'ScrapeBadger validation not yet implemented' });
        break;
      }

      case 'linkedapi': {
        // LinkedAPI health check — adjust when we know the actual API
        res.json({ connected: true, provider, note: 'LinkedAPI validation not yet implemented' });
        break;
      }

      default:
        res.status(400).json({ error: `Unknown provider: ${provider}` });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed';
    res.json({ connected: false, provider, error: message });
  }
});

export default router;
