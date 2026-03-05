import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import { supabase } from '../../db/supabase.js';

const router = Router();

// Multer stores uploads in memory so we can stream directly to Supabase storage.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50 MB

const VALID_ASSET_TYPES = ['clip', 'graphic', 'headshot', 'show_notes', 'questions'] as const;

// ─── GET /api/media/episodes/:episodeId/assets ───────────────────────────────
// List all assets for an episode.
router.get('/api/media/episodes/:episodeId/assets', async (req, res) => {
  const { episodeId } = req.params;

  const { data, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('episode_id', episodeId)
    .order('created_at', { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

// ─── POST /api/media/episodes/:episodeId/assets ─────────────────────────────
// Create a new asset. Two modes:
//   1. File upload (multipart form) — stores in Supabase storage bucket 'media-assets'
//   2. External link (JSON body) — saves URL directly, no file storage
router.post(
  '/api/media/episodes/:episodeId/assets',
  upload.single('file'),
  async (req, res) => {
    const { episodeId } = req.params;

    // Verify the episode exists
    const { data: episode, error: epErr } = await supabase
      .from('episodes')
      .select('id')
      .eq('id', episodeId)
      .single();

    if (epErr || !episode) {
      res.status(404).json({ error: 'Episode not found.' });
      return;
    }

    const assetType = req.body.asset_type;
    if (!assetType || !VALID_ASSET_TYPES.includes(assetType)) {
      res.status(400).json({ error: `asset_type must be one of: ${VALID_ASSET_TYPES.join(', ')}` });
      return;
    }

    const title = req.body.title || null;

    // ── Mode 1: File upload ──
    if (req.file) {
      const ext = req.file.originalname.split('.').pop() || 'bin';
      const storagePath = `${episodeId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('media-assets')
        .upload(storagePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (uploadErr) {
        res.status(500).json({ error: `Storage upload failed: ${uploadErr.message}` });
        return;
      }

      const { data: urlData } = supabase.storage
        .from('media-assets')
        .getPublicUrl(storagePath);

      const { data, error } = await supabase
        .from('media_assets')
        .insert({
          episode_id: episodeId,
          asset_type: assetType,
          title,
          storage_url: urlData.publicUrl,
          file_name: req.file.originalname,
          mime_type: req.file.mimetype,
        })
        .select()
        .single();

      if (error) {
        // Clean up the uploaded file if DB insert fails
        await supabase.storage.from('media-assets').remove([storagePath]);
        res.status(500).json({ error: error.message });
        return;
      }

      res.status(201).json(data);
      return;
    }

    // ── Mode 2: External link ──
    const externalUrl = req.body.external_url;
    if (!externalUrl || typeof externalUrl !== 'string') {
      res.status(400).json({ error: 'Either a file upload or external_url is required.' });
      return;
    }

    const { data, error } = await supabase
      .from('media_assets')
      .insert({
        episode_id: episodeId,
        asset_type: assetType,
        title,
        external_url: externalUrl,
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(201).json(data);
  },
);

// ─── DELETE /api/media/assets/:id ────────────────────────────────────────────
// Delete an asset. If it has a storage_url, also delete from Supabase storage.
router.delete('/api/media/assets/:id', async (req, res) => {
  const { id } = req.params;

  // Load the asset to check for storage file
  const { data: asset, error: loadErr } = await supabase
    .from('media_assets')
    .select('storage_url')
    .eq('id', id)
    .single();

  if (loadErr || !asset) {
    res.status(404).json({ error: 'Asset not found.' });
    return;
  }

  // Delete from storage if applicable
  const storagePath = extractStoragePath(asset.storage_url);
  if (storagePath) {
    await supabase.storage.from('media-assets').remove([storagePath]);
  }

  // Delete the DB row
  const { error } = await supabase
    .from('media_assets')
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
