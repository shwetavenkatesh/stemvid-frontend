export type Tier = "free" | "pro";

export type JobStatus =
  | "queued"
  | "generating_script"
  | "generating_audio"
  | "creating_animations"
  | "rendering"
  | "reviewing"
  | "finalizing"
  | "ready"
  | "failed";

export type SegmentVideoStatus = "pending" | "ready" | "regenerating" | "failed";
export type SegmentAudioStatus = "pending" | "ready";

export interface StudioSegment {
  index: number;
  video_url: string | null;
  video_status: SegmentVideoStatus;
  audio_status: SegmentAudioStatus;
  narration_text: string | null;
}

export type Rating = "thumbs_up" | "thumbs_down";

export interface Profile {
  id: string;
  email: string;
  tier: Tier;
  videos_used_this_month: number;
  created_at: string;
  accepted_tos_at: string | null;
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
  course_id?: string | null;
  video_index?: number | null;
  error_message?: string | null;
}

export type CourseStatus =
  | "queued"
  | "building_structure"
  | "structure_ready"
  | "quota_exceeded"
  | "failed"
  | "complete";

export interface CourseVideoInfo {
  index: number;
  title: string;
  concepts: string[];
  chapter_reference?: string;
  source_section?: string;
}

export interface BookCourseStructure {
  course_title: string;
  book: string;
  total_videos: number;
  videos: CourseVideoInfo[];
}

export interface PaperCourseStructure {
  paper_title: string;
  total_concepts: number;
  total_parts: number;
  parts: CourseVideoInfo[];
}

export type CourseStructure = BookCourseStructure | PaperCourseStructure;

// NULL means "book" — source_type didn't exist before papers could reach the
// courses table, so every pre-existing row predates the column entirely.
export type CourseSourceType = "book" | "paper" | null;

export interface Course {
  id: string;
  user_id: string;
  title: string;
  pdf_url: string;
  status: CourseStatus;
  source_type?: CourseSourceType;
  course_structure: CourseStructure | null;
  total_videos: number | null;
  completed_videos: number | null;
  current_video_index: number | null;
  error_message: string | null;
  created_at: string;
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
