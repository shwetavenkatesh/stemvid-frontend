import type { Course, CourseVideoInfo, Job } from "@/types";

export interface PendingTrigger {
  position: number;
  // The id of whatever job existed at `position` at the moment the trigger was sent
  // (or null if none did). generate_course_video deletes-then-inserts on every call, so
  // this id is guaranteed to change once the backend has actually acted on the trigger —
  // comparing against it (rather than a bare position number) is what lets the same
  // mechanism cover both "no job yet" (first generation) and "job already exists but
  // failed" (retry) without needing a separate clearing effect.
  priorJobId: string | null;
}

export interface CourseProgress {
  jobByPosition: Map<number, Job>;
  readyCount: number;
  nextPosition: number;
  canGenerateNext: boolean;
  isRetry: boolean;
  firstVideoStarting: boolean;
}

/**
 * courseJobs: all `jobs` rows for this course. `jobs.video_index` matches the position of
 * the corresponding entry in `videos` (course_structure.videos), not that entry's
 * author-assigned `index` field.
 */
export function getCourseProgress(
  videos: CourseVideoInfo[],
  courseJobs: Job[],
  courseStatus: Course["status"],
  pendingTrigger: PendingTrigger | null
): CourseProgress {
  const jobByPosition = new Map(
    courseJobs
      .filter((job): job is Job & { video_index: number } => job.video_index != null)
      .map((job) => [job.video_index, job])
  );
  const readyCount = courseJobs.filter((j) => j.status === "ready").length;
  const nextPosition = courseJobs.reduce(
    (max, job) =>
      job.status === "ready" ? Math.max(max, (job.video_index ?? -1) + 1) : max,
    0
  );

  const jobAtNext = jobByPosition.get(nextPosition);
  const isRetry = jobAtNext?.status === "failed";

  const isPending =
    pendingTrigger !== null &&
    pendingTrigger.position === nextPosition &&
    (jobAtNext?.id ?? null) === pendingTrigger.priorJobId;

  // Position 0 is always auto-started by the backend the moment the course structure is
  // ready — it must never be *newly* triggered by the user, or a slow-to-arrive job row
  // would let the button appear and double-start it. But if it already failed, retrying it
  // is exactly what the user needs — there is no other way to recover a course whose very
  // first video failed.
  const blockedAsAutoStarted = nextPosition === 0 && !isRetry;

  const canGenerateNext =
    videos.length > 0 &&
    nextPosition < videos.length &&
    !blockedAsAutoStarted &&
    (!jobAtNext || isRetry) &&
    !isPending &&
    courseStatus !== "failed" &&
    courseStatus !== "quota_exceeded" &&
    courseStatus !== "complete";

  const firstVideoStarting =
    videos.length > 0 && nextPosition === 0 && !jobAtNext;

  return { jobByPosition, readyCount, nextPosition, canGenerateNext, isRetry, firstVideoStarting };
}
