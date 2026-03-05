export type Platform = 'linkedin' | 'twitter';

export type AccountSlug =
  | 'matt_linkedin'
  | 'prefactor_linkedin'
  | 'prefactor_x'
  | 'agents_after_dark_linkedin';

export type PostStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'failed';

export type PostCategory =
  | 'ecosystem'
  | 'governance'
  | 'security'
  | 'enterprise_ai'
  | 'podcast_events'
  | 'founder'
  | 'direct_value'
  | 'product';

export interface ComposerPost {
  id: number;
  account: AccountSlug;
  content: string;
  platform: Platform;
  status: PostStatus;
  category: PostCategory | null;
  is_reshare: boolean;
  is_podcast: boolean;
  guest_name: string | null;
  episode_number: number | null;
  scheduled_at: string | null;
  published_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  slack_message_ts: string | null;
  platform_post_id: string | null;
  source_topic: string | null;
  source_keyword: string | null;
  created_at: string;
  updated_at: string;
}

export interface DraftRequest {
  topicId: string;
  topicTitle: string;
  topicSummary: string;
  keywords: string[];
  sourceLinks?: string[];
  platform: Platform;
  account: AccountSlug;
  angle?: string;
  category?: PostCategory;
  guestName?: string;
  episodeNumber?: number;
}

export interface PlatformResult {
  platform: Platform;
  success: boolean;
  postId?: string;
  url?: string;
  error?: string;
}
