import 'dotenv/config';
import fs from 'fs';
import path from 'path';

/**
 * Migration runner using the Supabase REST API.
 *
 * Reads schema.sql and executes it via Supabase's SQL endpoint.
 * All statements use IF NOT EXISTS / ON CONFLICT so it's safe to
 * run multiple times.
 */
async function migrate() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('[migrate] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const schemaPath = path.join(import.meta.dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  console.log('[migrate] Running schema.sql against Supabase...');

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  // The RPC endpoint won't exist yet, so fall back to the SQL endpoint
  if (!res.ok) {
    // Try the pg-meta SQL endpoint instead
    const sqlRes = await fetch(`${supabaseUrl}/pg/query`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!sqlRes.ok) {
      const body = await sqlRes.text();
      console.error(`[migrate] Failed: ${sqlRes.status} ${body}`);
      console.error('\n[migrate] Please run schema.sql manually in the Supabase SQL Editor:');
      console.error('  1. Go to your Supabase dashboard → SQL Editor');
      console.error('  2. Paste the contents of src/db/schema.sql');
      console.error('  3. Click Run');
      process.exit(1);
    }

    console.log('[migrate] Schema applied successfully via pg endpoint.');
    return;
  }

  console.log('[migrate] Schema applied successfully.');
}

migrate().catch((err) => {
  console.error('[migrate] Fatal error:', err);
  process.exit(1);
});
