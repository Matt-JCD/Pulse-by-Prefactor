import { supabase } from '../../db/supabase.js';
import { getSydneyDate } from '../../utils/sydneyDate.js';

/**
 * Wraps an agent function with run_log tracking.
 * Records start time, duration, result, and any errors.
 */
export async function withRunLog<T>(
  functionName: string,
  fn: () => Promise<T & { postsFetched?: number; llmTokens?: number }>,
): Promise<T> {
  const startTime = Date.now();
  const today = getSydneyDate();

  try {
    const result = await fn();
    const durationMs = Date.now() - startTime;

    await supabase.from('run_log').insert({
      date: today,
      function_name: functionName,
      status: 'success',
      duration_ms: durationMs,
      posts_fetched: result.postsFetched ?? null,
      llm_tokens: result.llmTokens ?? null,
    });

    console.log(`[${functionName}] Completed in ${durationMs}ms`);
    return result;
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);

    await supabase.from('run_log').insert({
      date: today,
      function_name: functionName,
      status: 'error',
      duration_ms: durationMs,
      error_msg: errorMsg,
    });

    console.error(`[${functionName}] Failed after ${durationMs}ms: ${errorMsg}`);
    throw err;
  }
}
