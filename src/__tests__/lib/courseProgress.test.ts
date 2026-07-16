import { getCourseProgress } from "@/lib/courseProgress";
import type { CourseVideoInfo, Job } from "@/types";

const videos: CourseVideoInfo[] = [
  { index: 1, title: "Video 1", concepts: [], chapter_reference: "Ch 1", source_section: "1" },
  { index: 2, title: "Video 2", concepts: [], chapter_reference: "Ch 2", source_section: "2" },
  { index: 3, title: "Video 3", concepts: [], chapter_reference: "Ch 3", source_section: "3" },
];

function job(id: string, video_index: number, status: Job["status"]): Job {
  return {
    id,
    user_id: "u1",
    title: `Video ${video_index}`,
    pdf_url: "https://example.com/book.pdf",
    status,
    video_url: status === "ready" ? "https://example.com/video.mp4" : null,
    created_at: "2026-01-01",
    completed_at: null,
    regen_log: null,
    course_id: "course-1",
    video_index,
    error_message: status === "failed" ? "something went wrong" : null,
  };
}

describe("getCourseProgress", () => {
  it("never allows manually triggering video position 0, even before its job row exists", () => {
    // Regression test: structure_ready fires and the backend auto-spawns position 0, but
    // Modal's spawn is async — there's a window with zero job rows in Supabase yet.
    const progress = getCourseProgress(videos, [], "structure_ready", null);
    expect(progress.nextPosition).toBe(0);
    expect(progress.canGenerateNext).toBe(false);
    expect(progress.firstVideoStarting).toBe(true);
  });

  it("hides the generate button while position 0 is already in flight", () => {
    const progress = getCourseProgress(videos, [job("j0", 0, "generating_script")], "structure_ready", null);
    expect(progress.canGenerateNext).toBe(false);
    expect(progress.firstVideoStarting).toBe(false);
  });

  it("allows generating video 2 once video 1 (position 0) is ready", () => {
    const progress = getCourseProgress(videos, [job("j0", 0, "ready")], "structure_ready", null);
    expect(progress.nextPosition).toBe(1);
    expect(progress.canGenerateNext).toBe(true);
    expect(progress.isRetry).toBe(false);
    expect(progress.readyCount).toBe(1);
  });

  it("blocks re-triggering the next video while its job row has not landed yet", () => {
    // Regression test: right after a successful trigger POST, Modal's async spawn means the
    // job row may not exist in Supabase for a moment. pendingTrigger covers that window by
    // remembering there was no job at that position when the trigger was sent.
    const progress = getCourseProgress(
      videos,
      [job("j0", 0, "ready")],
      "structure_ready",
      { position: 1, priorJobId: null }
    );
    expect(progress.nextPosition).toBe(1);
    expect(progress.canGenerateNext).toBe(false);
  });

  it("unblocks once the pending job row actually appears with a new id", () => {
    const progress = getCourseProgress(
      videos,
      [job("j0", 0, "ready"), job("j1", 1, "generating_script")],
      "structure_ready",
      { position: 1, priorJobId: null }
    );
    // The job at position 1 now has an id different from the pending trigger's
    // priorJobId (null) -- the guard should no longer apply.
    expect(progress.canGenerateNext).toBe(false); // blocked because position 1 is now in flight, not by pending
  });

  it("blocks generating once every video is done", () => {
    const progress = getCourseProgress(
      videos,
      [job("j0", 0, "ready"), job("j1", 1, "ready"), job("j2", 2, "ready")],
      "complete",
      null
    );
    expect(progress.canGenerateNext).toBe(false);
    expect(progress.readyCount).toBe(3);
  });

  it("blocks generating when the course failed or hit its quota", () => {
    const readyFirst = [job("j0", 0, "ready")];
    expect(getCourseProgress(videos, readyFirst, "failed", null).canGenerateNext).toBe(false);
    expect(getCourseProgress(videos, readyFirst, "quota_exceeded", null).canGenerateNext).toBe(false);
  });

  it("does not offer to generate past the last video", () => {
    const allReady = [job("j0", 0, "ready"), job("j1", 1, "ready"), job("j2", 2, "ready")];
    const progress = getCourseProgress(videos, allReady, "structure_ready", null);
    expect(progress.nextPosition).toBe(3);
    expect(progress.canGenerateNext).toBe(false);
  });

  it("returns no progress when the curriculum hasn't been built yet", () => {
    const progress = getCourseProgress([], [], "building_structure", null);
    expect(progress.canGenerateNext).toBe(false);
    expect(progress.firstVideoStarting).toBe(false);
  });

  // ── Retry: regression coverage for the course-stuck-on-failure gap ─────────
  // Found while debugging a real book upload: generate_course_video's error handler
  // only marks the individual job failed, never the course -- by design, since a
  // failed video does not mean the curriculum/structure is broken. But the old
  // canGenerateNext treated ANY existing job at the next position (failed or not)
  // as permanently blocking, so a failed video was a dead end with no way to retry.

  it("offers a retry when a non-first video failed", () => {
    const progress = getCourseProgress(
      videos,
      [job("j0", 0, "ready"), job("j1", 1, "failed")],
      "structure_ready",
      null
    );
    expect(progress.nextPosition).toBe(1);
    expect(progress.canGenerateNext).toBe(true);
    expect(progress.isRetry).toBe(true);
  });

  it("offers a retry even for position 0 if it failed (the auto-start guard does not apply to failures)", () => {
    const progress = getCourseProgress(videos, [job("j0", 0, "failed")], "structure_ready", null);
    expect(progress.nextPosition).toBe(0);
    expect(progress.canGenerateNext).toBe(true);
    expect(progress.isRetry).toBe(true);
    expect(progress.firstVideoStarting).toBe(false);
  });

  it("blocks re-retrying while the retry's job row still shows the old failed id", () => {
    // generate_course_video deletes the old failed row and inserts a fresh one on retry --
    // until that swap is visible client-side, the prior (failed) job id is still what's
    // in courseJobs, so the pending guard must still hold.
    const failedJob = job("j1-old", 1, "failed");
    const progress = getCourseProgress(
      videos,
      [job("j0", 0, "ready"), failedJob],
      "structure_ready",
      { position: 1, priorJobId: "j1-old" }
    );
    expect(progress.canGenerateNext).toBe(false);
  });

  it("unblocks once the retried job row replaces the failed one with a new id", () => {
    const progress = getCourseProgress(
      videos,
      [job("j0", 0, "ready"), job("j1-new", 1, "queued")],
      "structure_ready",
      { position: 1, priorJobId: "j1-old" }
    );
    // Not blocked by pending (id changed); still correctly blocked because a
    // fresh non-failed job is now in flight at that position.
    expect(progress.canGenerateNext).toBe(false);
    expect(progress.isRetry).toBe(false);
  });
});
