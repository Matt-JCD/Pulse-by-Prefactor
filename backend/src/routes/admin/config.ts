import { Router } from 'express';
import { supabase } from '../../db/supabase.js';

const router = Router();

// Fields that contain secrets — these get masked in GET responses
const SECRET_FIELDS = [
  'anthropic_api_key',
  'openai_api_key',
  'mistral_api_key',
  'scrapebadger_api_key',
  'linkedapi_key',
  'prefactor_sdk_key',
] as const;

function maskValue(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 8) return '••••••••';
  return value.slice(0, 4) + '••••' + value.slice(-4);
}

// GET /api/admin/config — returns config with API keys masked
router.get('/api/admin/config', async (_req, res) => {
  const { data, error } = await supabase
    .from('config')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Mask secret fields
  const masked = { ...data };
  for (const field of SECRET_FIELDS) {
    if (field in masked) {
      (masked as Record<string, unknown>)[field] = maskValue(
        (data as Record<string, unknown>)[field] as string | null
      );
    }
  }

  res.json(masked);
});

// PUT /api/admin/config — update config fields
router.put('/api/admin/config', async (req, res) => {
  const updates = req.body;

  if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'Request body must be a non-empty object' });
    return;
  }

  // Don't allow changing the id
  delete updates.id;

  // Set updated_at timestamp
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('config')
    .update(updates)
    .eq('id', 1)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Mask secrets in the response
  const masked = { ...data };
  for (const field of SECRET_FIELDS) {
    if (field in masked) {
      (masked as Record<string, unknown>)[field] = maskValue(
        (data as Record<string, unknown>)[field] as string | null
      );
    }
  }

  res.json(masked);
});

export default router;
