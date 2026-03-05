import type { AccountSlug, Platform } from './types.js';

/**
 * Account configuration for each of the four Pulse accounts.
 *
 * This is the single source of truth for:
 * - Which platform an account publishes to
 * - Character limits and hashtag rules
 * - Badge colours for Slack digest and frontend UI
 */
export interface AccountConfig {
  slug: AccountSlug;
  label: string;
  platform: Platform;
  badgeColor: string;
  charMin: number;
  charMax: number;
  hashtagPolicy: 'none' | 'few';
  voiceDescription: string;
}

export const ACCOUNTS: Record<AccountSlug, AccountConfig> = {
  matt_linkedin: {
    slug: 'matt_linkedin',
    label: 'Matt (LinkedIn)',
    platform: 'linkedin',
    badgeColor: '#2563eb',       // blue
    charMin: 400,
    charMax: 900,
    hashtagPolicy: 'none',
    voiceDescription: 'Founder voice — human, direct, opinionated',
  },
  prefactor_linkedin: {
    slug: 'prefactor_linkedin',
    label: 'Prefactor (LinkedIn)',
    platform: 'linkedin',
    badgeColor: '#93D1BD',       // sage
    charMin: 600,
    charMax: 1200,
    hashtagPolicy: 'few',
    voiceDescription: 'Brand voice — authoritative, considered, engineering-clear',
  },
  prefactor_x: {
    slug: 'prefactor_x',
    label: 'Prefactor (X)',
    platform: 'twitter',
    badgeColor: '#1a1a2e',       // dark
    charMin: 0,
    charMax: 280,
    hashtagPolicy: 'few',
    voiceDescription: 'Fast, reactive, first-mover — punchy, no hedging',
  },
  agents_after_dark_linkedin: {
    slug: 'agents_after_dark_linkedin',
    label: 'Agents After Dark (LinkedIn)',
    platform: 'linkedin',
    badgeColor: '#7c3aed',       // purple
    charMin: 600,
    charMax: 1200,
    hashtagPolicy: 'few',
    voiceDescription: 'Warm, community-focused podcast host voice',
  },
};

/** All valid account slugs. */
export const ACCOUNT_SLUGS = Object.keys(ACCOUNTS) as AccountSlug[];

/** Look up the platform for an account (e.g. agents_after_dark_linkedin → 'linkedin'). */
export function getPlatformForAccount(account: AccountSlug): Platform {
  return ACCOUNTS[account].platform;
}
