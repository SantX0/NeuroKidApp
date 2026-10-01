import { storage } from "@/src/utils/storage";

export const TOKEN_KEY = "neurokid_access_token";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await storage.secureGet<string>(TOKEN_KEY, "");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}/api${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const detail =
      typeof data?.detail === "string" ? data.detail : "Algo deu errado";
    throw new ApiError(detail, res.status);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
};

// ------------------------------------------------------------------- types
export type Child = {
  id: string;
  name: string;
  age: number;
  bracket: string;
  bracket_label: string;
  bracket_range: string;
  avatar_color: string;
  device: string;
  shield_active: boolean;
  daily_limit_minutes: number;
  allowed_content: string[];
};

export type Dashboard = {
  child: Child;
  screen_time: { minutes: number; limit_minutes: number; ratio: number };
  sensory: {
    status_label: string;
    status_tone: string;
    avg_load: number;
    low_pct: number;
    moderate_pct: number;
    high_pct: number;
    wave: { at: string; load: number; hour: number }[];
  };
  interventions_today: number;
  protected_device: string;
  shield_active: boolean;
};

export type AlertItem = {
  id: string;
  kind: string;
  title: string;
  message: string;
  action: string;
  severity: string;
  at: string;
  cleared: boolean;
};

export type AlertFeed = {
  total: number;
  critical: number;
  groups: { label: string; items: AlertItem[] }[];
};

export type ContentItem = {
  id: string;
  title: string;
  subtitle: string;
  thumbnail: string;
  duration_minutes: number;
  cuts_per_minute: number;
  pacing: string;
  audio_note: string;
  age_brackets: string[];
  stimulus_badges: string[];
  ai_verdict: string;
  ai_reason: string;
  color_profile: string;
  flash_stimuli: boolean;
  allowed: boolean;
};

export type Analysis = {
  verdict: string;
  sensory_load_score: number;
  stimulus_badges: string[];
  why: string;
  parent_tip: string;
  source: string;
};

export type WeeklyReport = {
  child: Child;
  total_minutes: number;
  delta_pct: number;
  spikes_intercepted: number;
  balance_score: number;
  balance_label: string;
  avg_load: number;
  days: { date: string; weekday: string; minutes: number; avg_load: number }[];
  activities: { title: string; why: string; minutes: number; icon: string }[];
};
