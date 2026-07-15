import type { Course, CourseVideoInfo, Job } from "@/types";

export interface CourseProgress {
  jobByPosition: Map<number, Job>;
  readyCount: number;
  nextPosition: number;
  canGenerateNext: boolean;
  firstVideoStarting: boolean;
}

/**
 * courseJobs: all `jobs` rows for this course. `jobs.video_index` matches the position of
 * the corresponding entry in `videos` (course_structure.videos), not that entry's
 * author-assigned `index` field.
 * pendingPosition: position of a manual trigger whose job row may not have landed yet
 * (Modal's spawn is async — see the caller for why this guard exists).
 */
export function getCourseProgress(
  videos: CourseVideoInfo[],
  courseJobs: Job[],
  courseStatus: Course["status"],
  pendingPosition: number | null
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

  const canGenerateNext =
    videos.length > 0 &&
    // Position 0 is always auto-started by the backend the moment the course structure is
    // ready — it must never be manually triggerable, or a slow-to-arrive job row would let
    // the button appear and double-start it.
    nextPosition > 0 &&
    nextPosition < videos.length &&
    !jobByPosition.has(nextPosition) &&
    pendingPosition !== nextPosition &&
    courseStatus !== "failed" &&
    courseStatus !== "quota_exceeded" &&
    courseStatus !== "complete";

  const firstVideoStarting =
    videos.length > 0 && nextPosition === 0 && !jobByPosition.has(0);

  return { jobByPosition, readyCount, nextPosition, canGenerateNext, firstVideoStarting };
}
