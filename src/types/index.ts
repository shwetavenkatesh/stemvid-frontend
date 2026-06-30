export type Tier = "free" | "pro";

export type JobStatus =
  | "queued"
  | "generating_script"
  | "creating_animations"
  | "rendering"
  | "ready"
  | "failed";

export type Rating = "thumbs_up" | "thumbs_down";

export interface Profile {
  id: string;
  email: string;
  tier: Tier;
  videos_used_this_month: number;
  created_at: string;
}

export interface RegenLog {
  requested: number[];
  done: number[];
  failed: number[];
}

export interface Job {
  id: string;
  user_id: string;
  title: string;
  pdf_url: string;
  status: JobStatus;
  video_url: string | null;
  created_at: string;
  completed_at: string | null;
  regen_log: RegenLog | null;
}

export interface Feedback {
  id: string;
  job_id: string;
  user_id: string;
  rating: Rating;
  reason: string | null;
  created_at: string;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  created_at: string;
}
