import type { AccountSlug } from './types.js';
import { getSydneyDayOfWeek } from '../utils/sydneyDate.js';

/**
 * Ordering guards for the content engine.
 *
 * These are pure functions — no database calls, no side effects.
 * The caller passes in the post being validated and any existing posts
 * for the same day/account so the guards can make their checks.
 *
 * Both guards run on submit (draft → pending_approval) and on edit
 * (re-validation after content or schedule changes).
 */

export interface OrderingError {
  valid: false;
  error: string;
}

export interface OrderingOk {
  valid: true;
}

export type OrderingResult = OrderingOk | OrderingError;

// ─── Wednesday Enforcement ───────────────────────────────────────────────────
// Every post on Wednesday must be podcast-related. No exceptions.

export function validateWednesday(scheduledAt: string | null, isPodcast: boolean): OrderingResult {
  if (!scheduledAt) return { valid: true };

  const dayOfWeek = getSydneyDayOfWeek(new Date(scheduledAt)); // 0=Sun, 3=Wed

  if (dayOfWeek === 3 && !isPodcast) {
    return {
      valid: false,
      error: 'Wednesday posts must be podcast-related. Set is_podcast = true or reschedule to another day.',
    };
  }

  return { valid: true };
}

// ─── Reshare Ordering Guard ──────────────────────────────────────────────────
// A reshare cannot be scheduled unless an original post (is_reshare = false)
// already exists for the same account on the same calendar day.

export function validateReshareOrder(
  post: { account: AccountSlug; scheduled_at: string | null; is_reshare: boolean },
  existingPostsForDay: Array<{ is_reshare: boolean }>,
): OrderingResult {
  if (!post.is_reshare) return { valid: true };
  if (!post.scheduled_at) return { valid: true };

  const hasOriginal = existingPostsForDay.some((p) => !p.is_reshare);

  if (!hasOriginal) {
    return {
      valid: false,
      error: 'No original post found for this account today. Schedule the original post first.',
    };
  }

  return { valid: true };
}

// ─── Run All Guards ──────────────────────────────────────────────────────────
// Convenience function that runs both checks and returns the first failure.

export function validatePost(
  post: { account: AccountSlug; scheduled_at: string | null; is_reshare: boolean; is_podcast: boolean },
  existingPostsForDay: Array<{ is_reshare: boolean }>,
): OrderingResult {
  const wed = validateWednesday(post.scheduled_at, post.is_podcast);
  if (!wed.valid) return wed;

  const reshare = validateReshareOrder(post, existingPostsForDay);
  if (!reshare.valid) return reshare;

  return { valid: true };
}
