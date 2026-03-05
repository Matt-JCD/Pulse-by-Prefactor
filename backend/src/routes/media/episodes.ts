import { Router } from 'express';
import { supabase } from '../../db/supabase.js';

const router = Router();

// ─── GET /api/media/episodes ─────────────────────────────────────────────────
// List all episodes, ordered by publish_date DESC.
router.get('/api/media/episodes', async (_req, res) => {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .order('publish_date', { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

// ─── GET /api/media/episodes/latest ──────────────────────────────────────────
// Returns the most recent episode (by publish_date) with all its assets.
// Used by the Composer to auto-suggest assets on Wednesdays.
router.get('/api/media/episodes/latest', async (_req, res) => {
  const { data: episode, error: epErr } = await supabase
    .from('episodes')
    .select('*')
    .order('publish_date', { ascending: false })
    .limit(1)
    .single();

  if (epErr || !episode) {
    res.status(404).json({ error: 'No episodes found.' });
    return;
  }

  const { data: assets, error: assetsErr } = await supabase
    .from('media_assets')
    .select('*')
    .eq('episode_id', episode.id)
    .order('created_at', { ascending: true });

  if (assetsErr) {
    res.status(500).json({ error: assetsErr.message });
    return;
  }

  res.json({ ...episode, assets: assets || [] });
});

// ─── POST /api/media/episodes ────────────────────────────────────────────────
// Create a new episode.
router.post('/api/media/episodes', async (req, res) => {
  const { title, guest_name, episode_number, publish_date, status } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    res.status(400).json({ error: 'title is required.' });
    return;
  }

  const validStatuses = ['upcoming', 'published'];
  if (status && !validStatuses.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  const { data, error } = await supabase
    .from('episodes')
    .insert({
      title: title.trim(),
      guest_name: guest_name || null,
      episode_number: episode_number != null ? Number(episode_number) : null,
      publish_date: publish_date || null,
      status: status || 'upcoming',
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
});

// ─── PATCH /api/media/episodes/:id ───────────────────────────────────────────
// Update any fields on an episode.
router.patch('/api/media/episodes/:id', async (req, res) => {
  const { id } = req.params;
  const { title, guest_name, episode_number, publish_date, status } = req.body;

  const validStatuses = ['upcoming', 'published'];
  if (status && !validStatuses.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (title !== undefined) updates.title = title.trim();
  if (guest_name !== undefined) updates.guest_name = guest_name || null;
  if (episode_number !== undefined) updates.episode_number = episode_number != null ? Number(episode_number) : null;
  if (publish_date !== undefined) updates.publish_date = publish_date || null;
  if (status !== undefined) updates.status = status;

  const { data, error } = await supabase
    .from('episodes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    res.status(404).json({ error: 'Episode not found.' });
    return;
  }

  res.json(data);
});

// ─── DELETE /api/media/episodes/:id ──────────────────────────────────────────
// Delete an episode. Assets are cascade-deleted by the DB FK constraint.
// Also cleans up any Supabase storage files for those assets.
router.delete('/api/media/episodes/:id', async (req, res) => {
  const { id } = req.params;

  // Load assets first so we can clean up storage
  const { data: assets } = await supabase
    .from('media_assets')
    .select('storage_url')
    .eq('episode_id', id);

  // Delete storage files for any uploaded assets
  if (assets && assets.length > 0) {
    const storagePaths = assets
      .map((a) => extractStoragePath(a.storage_url))
      .filter((p): p is string => !!p);

    if (storagePaths.length > 0) {
      await supabase.storage.from('media-assets').remove(storagePaths);
    }
  }

  // DB cascade handles media_assets rows
  const { error } = await supabase
    .from('episodes')
    .delete()
    .eq('id', id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ deleted: true, id });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract the storage path from a Supabase public URL. */
function extractStoragePath(url: string | null): string | null {
  if (!url) return null;
  const marker = '/object/public/media-assets/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

export default router;
