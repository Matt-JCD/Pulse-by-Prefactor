import { supabase } from '../db/supabase.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';
const MODEL = 'text-embedding-ada-002';

/**
 * Calls the OpenAI embeddings API and returns the raw vector.
 * Throws on API error or missing key.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const res = await fetch(EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI embeddings API error ${res.status}: ${body}`);
  }

  const json = await res.json() as { data: Array<{ embedding: number[] }> };
  return json.data[0].embedding;
}

/**
 * Writes a pre-computed embedding vector to the posts table.
 */
export async function storeEmbedding(postId: number, embedding: number[]): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .update({ embedding: JSON.stringify(embedding) })
    .eq('id', postId);

  if (error) {
    throw new Error(`Failed to store embedding for post ${postId}: ${error.message}`);
  }
}

/**
 * Generates and stores an embedding for a post.
 * Non-blocking — logs errors but never throws.
 */
export async function embedPost(postId: number, content: string): Promise<void> {
  try {
    const embedding = await generateEmbedding(content);
    await storeEmbedding(postId, embedding);
    console.log(`[embeddings] Stored embedding for post #${postId}`);
  } catch (err) {
    console.error(`[embeddings] Failed for post #${postId}:`, err instanceof Error ? err.message : err);
  }
}
