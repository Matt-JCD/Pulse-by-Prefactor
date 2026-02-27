import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sql = fs.readFileSync(path.join(import.meta.dirname, 'migrations/010_alter_daily_report.sql'), 'utf-8');

console.log('[migration-010] Running against Supabase...');

const res = await fetch(`${url}/pg/query`, {
  method: 'POST',
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();

if (res.ok) {
  console.log('[migration-010] Success:', text);
} else {
  console.error('[migration-010] Failed:', res.status, text);
  process.exit(1);
}
