/**
 * Account config mirroring GET /api/composer/accounts.
 * Hardcoded — accounts are static config, changed only by code deploys.
 */
export interface AccountConfig {
  slug: string;
  label: string;
  platform: string;
  badgeColor: string;
  charMin: number;
  charMax: number;
  hashtagPolicy: 'none' | 'few';
}

export const ACCOUNTS: AccountConfig[] = [
  { slug: 'matt_linkedin',              label: 'Matt (LinkedIn)',              platform: 'linkedin', badgeColor: '#2563eb', charMin: 400,  charMax: 900,  hashtagPolicy: 'none' },
  { slug: 'prefactor_linkedin',         label: 'Prefactor (LinkedIn)',         platform: 'linkedin', badgeColor: '#93D1BD', charMin: 600,  charMax: 1200, hashtagPolicy: 'few'  },
  { slug: 'prefactor_x',               label: 'Prefactor (X)',                platform: 'twitter',  badgeColor: '#1a1a2e', charMin: 0,    charMax: 280,  hashtagPolicy: 'none' },
  { slug: 'agents_after_dark_linkedin', label: 'Agents After Dark (LinkedIn)', platform: 'linkedin', badgeColor: '#7c3aed', charMin: 600,  charMax: 1200, hashtagPolicy: 'few'  },
];

export const ACCOUNT_MAP: Record<string, AccountConfig> = Object.fromEntries(
  ACCOUNTS.map((a) => [a.slug, a]),
);

export const CATEGORIES = [
  { value: '',               label: 'Auto-detect' },
  { value: 'ecosystem',      label: 'Ecosystem' },
  { value: 'governance',     label: 'Governance' },
  { value: 'security',       label: 'Security' },
  { value: 'enterprise_ai',  label: 'Enterprise AI' },
  { value: 'podcast_events', label: 'Podcast & Events' },
  { value: 'founder',        label: 'Founder' },
  { value: 'direct_value',   label: 'Direct Value' },
  { value: 'product',        label: 'Product' },
];

/** Map an intelligence pipeline topic to the closest post category. */
export function mapTopicToPostCategory(keyword: string, intelligenceCategory: string): string {
  const kw = keyword.toLowerCase();
  if (kw.includes('security') || kw.includes('vulnerability') || kw.includes('dlp')) return 'security';
  if (kw.includes('governance') || kw.includes('risk management') || kw.includes('compliance') || kw.includes('oversight')) return 'governance';
  if (kw.includes('observability') || kw.includes('enterprise ai') || kw.includes('enterprise')) return 'enterprise_ai';
  if (intelligenceCategory === 'ecosystem') return 'ecosystem';
  return 'enterprise_ai';
}

export const CATEGORY_MAP: Record<string, { label: string; className: string }> = {
  ecosystem:      { label: 'Ecosystem',        className: 'bg-aqua/10 text-aqua' },
  governance:     { label: 'Governance',        className: 'bg-amber-900/20 text-amber-400' },
  security:       { label: 'Security',          className: 'bg-red-900/20 text-red-400' },
  enterprise_ai:  { label: 'Enterprise AI',     className: 'bg-blue-900/20 text-blue-400' },
  podcast_events: { label: 'Podcast & Events',  className: 'bg-purple-900/20 text-purple-400' },
  founder:        { label: 'Founder',           className: 'bg-sage/10 text-sage' },
  direct_value:   { label: 'Direct Value',      className: 'bg-emerald-900/20 text-emerald-400' },
  product:        { label: 'Product',           className: 'bg-zinc-800 text-zinc-300' },
};
