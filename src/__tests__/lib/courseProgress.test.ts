import { getCourseProgress } from "@/lib/courseProgress";
import type { CourseVideoInfo, Job } from "@/types";

const videos: CourseVideoInfo[] = [
  { index: 1, title: "Video 1", concepts: [], chapter_reference: "Ch 1", source_section: "1" },
  { index: 2, title: "Video 2", concepts: [], chapter_reference: "Ch 2", source_section: "2" },
  { index: 3, title: "Video 3", concepts: [], chapter_reference: "Ch 3", source_section: "3" },
];

function job(video_index: number, status: Job["status"]): Job {
  return {
    id: `job-${video_index}`,
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
    const progress = getCourseProgress(videos, [job(0, "generating_script")], "structure_ready", null);
    expect(progress.canGenerateNext).toBe(false);
    expect(progress.firstVideoStarting).toBe(false);
  });

  it("allows generating video 2 once video 1 (position 0) is ready", () => {
    const progress = getCourseProgress(videos, [job(0, "ready")], "structure_ready", null);
    expect(progress.nextPosition).toBe(1);
    expect(progress.canGenerateNext).toBe(true);
    expect(progress.readyCount).toBe(1);
  });

  it("blocks re-triggering the next video while its job row hasn't landed yet (pendingPosition)", () => {
    // Regression test: right after a successful trigger POST, Modal's async spawn means the
    // job row may not exist in Supabase for a moment — pendingPosition covers that window.
    const progress = getCourseProgress(videos, [job(0, "ready")], "structure_ready", 1);
    expect(progress.nextPosition).toBe(1);
    expect(progress.canGenerateNext).toBe(false);
  });

  it("blocks generating once every video is done", () => {
    const progress = getCourseProgress(
      videos,
      [job(0, "ready"), job(1, "ready"), job(2, "ready")],
      "complete",
      null
    );
    expect(progress.canGenerateNext).toBe(false);
    expect(progress.readyCount).toBe(3);
  });

  it("blocks generating when the course failed or hit its quota", () => {
    const readyFirst = [job(0, "ready")];
    expect(getCourseProgress(videos, readyFirst, "failed", null).canGenerateNext).toBe(false);
    expect(getCourseProgress(videos, readyFirst, "quota_exceeded", null).canGenerateNext).toBe(false);
  });

  it("does not offer to generate past the last video", () => {
    const allReady = [job(0, "ready"), job(1, "ready"), job(2, "ready")];
    const progress = getCourseProgress(videos, allReady, "structure_ready", null);
    expect(progress.nextPosition).toBe(3);
    expect(progress.canGenerateNext).toBe(false);
  });

  it("returns no progress when the curriculum hasn't been built yet", () => {
    const progress = getCourseProgress([], [], "building_structure", null);
    expect(progress.canGenerateNext).toBe(false);
    expect(progress.firstVideoStarting).toBe(false);
  });
});
