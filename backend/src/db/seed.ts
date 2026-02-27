import 'dotenv/config';
import { supabase } from './supabase.js';

/**
 * Seeds the database with default config and keywords.
 * Safe to run multiple times — uses upsert to avoid duplicates.
 */
async function seed() {
  console.log('[seed] Seeding database...');

  // Seed config with defaults (single row, id=1)
  const { error: configError } = await supabase
    .from('config')
    .upsert({
      id: 1,
      llm_provider: 'anthropic',
      llm_model: 'claude-haiku-4-5-20251001',
      daily_run_time_utc: '22:00',
      linkedin_frequency: 'every_other_day',
      posts_per_keyword: 20,
      email_report_enabled: false,
    });

  if (configError) {
    console.error('[seed] Failed to seed config:', configError.message);
    process.exit(1);
  }
  console.log('[seed] Config defaults inserted.');

  // Seed default keywords
  const defaultKeywords = [
    'claude',
    'claude code',
    'anthropic',
    'model context protocol',
    'webmcp',
    'openai',
    'codex',
    'google gemini',
    'mistral',
    'langchain',
    'langsmith',
    'langfuse',
    'cursor',
    'a2a',
  ];

  const keywordRows = defaultKeywords.map(keyword => ({
    keyword,
    active: true,
  }));

  const { error: keywordsError } = await supabase
    .from('keywords')
    .upsert(keywordRows, { onConflict: 'keyword' });

  if (keywordsError) {
    console.error('[seed] Failed to seed keywords:', keywordsError.message);
    process.exit(1);
  }
  console.log(`[seed] ${defaultKeywords.length} keywords inserted.`);

  console.log('[seed] Seeding complete.');
}

seed().catch((err) => {
  console.error('[seed] Fatal error:', err);
  process.exit(1);
});
