import type { Job, Profile, Feedback, WaitlistEntry, JobStatus, Tier } from "@/types";

describe("types", () => {
  it("Job type has correct shape", () => {
    const job: Job = {
      id: "1",
      user_id: "u1",
      title: "Test",
      pdf_url: "https://example.com/test.pdf",
      status: "queued",
      video_url: null,
      created_at: "2026-01-01",
      completed_at: null,
      regen_log: null,
    };
    expect(job.status).toBe("queued");
  });

  it("all JobStatus values are valid", () => {
    const statuses: JobStatus[] = [
      "queued",
      "generating_script",
      "creating_animations",
      "rendering",
      "ready",
      "failed",
    ];
    expect(statuses).toHaveLength(6);
  });

  it("Profile type has correct shape", () => {
    const profile: Profile = {
      id: "1",
      email: "test@test.com",
      tier: "free",
      videos_used_this_month: 0,
      created_at: "2026-01-01",
    };
    expect(profile.tier).toBe("free");
  });

  it("Tier values are free or pro", () => {
    const tiers: Tier[] = ["free", "pro"];
    expect(tiers).toHaveLength(2);
  });

  it("Feedback type has correct shape", () => {
    const fb: Feedback = {
      id: "1",
      job_id: "j1",
      user_id: "u1",
      rating: "thumbs_up",
      reason: null,
      created_at: "2026-01-01",
    };
    expect(fb.rating).toBe("thumbs_up");
  });

  it("WaitlistEntry type has correct shape", () => {
    const entry: WaitlistEntry = {
      id: "1",
      email: "test@test.com",
      created_at: "2026-01-01",
    };
    expect(entry.email).toBe("test@test.com");
  });
});
