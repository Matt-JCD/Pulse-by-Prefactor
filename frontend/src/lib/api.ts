const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body || res.statusText);
  }

  return res.json() as Promise<T>;
}

// --- Types matching the backend DB schema ---

export interface DailyReport {
  id: number;
  date: string;
  ecosystem_synthesis: string | null;
  enterprise_synthesis: string | null;
  sentiment_score: number | null;
  sentiment_direction: string | null;
  sentiment_label: string | null;
  slack_post_text: string | null;
  posted_at: string | null;
  created_at: string;
}

export interface KeywordSignal {
  id: number;
  date: string;
  platform: string;
  keyword: string;
  post_count: number;
  sentiment: string;
  momentum: string;
  category: string;
  created_at: string;
}

export interface EmergingTopic {
  id: number;
  date: string;
  platform: string;
  keyword: string;
  topic_key?: string | null;
  topic_title: string;
  summary: string;
  post_count: number;
  sample_urls: string[] | null;
  category: string;
  created_at: string;
}

export interface RunLogEntry {
  id: number;
  date: string;
  function_name: string;
  status: string;
  duration_ms: number | null;
  posts_fetched: number | null;
  llm_tokens: number | null;
  error_msg: string | null;
  created_at: string;
}

export interface ComposerPost {
  id: number;
  platform: string;
  content: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  platform_post_id: string | null;
  source_topic: string | null;
  source_keyword: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComposerStats {
  date: string;
  twitter: { count: number; limit: number };
  linkedin: { count: number; limit: number };
}

export interface RejectResult {
  rejected: { id: number; source_topic: string | null };
  replacement: ComposerPost | null;
}

export interface ReviseResult {
  rejected: { id: number; source_topic: string | null };
  revision: ComposerPost;
}

// --- API methods ---

export const api = {
  health: () => request<{ status: string; db: string }>("/api/health"),

  intelligence: {
    today: () =>
      request<DailyReport | { date: string; status: string }>(
        "/api/intelligence/today",
      ),
    keywords: (days = 14) =>
      request<KeywordSignal[]>(`/api/intelligence/keywords?days=${days}`),
    topics: (days = 7) =>
      request<EmergingTopic[]>(`/api/intelligence/topics?days=${days}`),
    runLog: () => request<RunLogEntry[]>("/api/intelligence/run-log"),
    triggerRun: (platform?: string) =>
      request<{ status: string; platform: string }>(
        "/api/intelligence/trigger-run",
        {
          method: "POST",
          body: JSON.stringify({ platform }),
        },
      ),
  },

  composer: {
    queue: () => request<ComposerPost[]>("/api/composer/queue"),
    stats: () => request<ComposerStats>("/api/composer/stats"),
    approve: (id: number) =>
      request<ComposerPost>(`/api/composer/${id}/approve`, { method: "PATCH" }),
    reject: (id: number) =>
      request<RejectResult>(`/api/composer/${id}/reject`, { method: "PATCH" }),
    revise: (id: number, feedback: string) =>
      request<ReviseResult>(`/api/composer/${id}/revise`, {
        method: "PATCH",
        body: JSON.stringify({ feedback }),
      }),
    edit: (id: number, content: string) =>
      request<ComposerPost>(`/api/composer/${id}/edit`, {
        method: "PATCH",
        body: JSON.stringify({ content }),
      }),
    draft: (body: {
      topicTitle: string;
      topicSummary: string;
      keywords: string[];
      sourceLinks?: string[];
      platform: string;
    }) =>
      request<ComposerPost>("/api/composer/draft", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
};
