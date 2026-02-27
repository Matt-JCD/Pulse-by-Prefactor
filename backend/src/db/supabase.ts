import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. ' +
    'Copy .env.example to .env and add your Supabase credentials.'
  );
}

// Service role client — bypasses RLS, used for backend operations only.
// Never expose this to the frontend.
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
