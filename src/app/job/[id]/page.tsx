"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/shared/Navbar";
import FeedbackWidget from "@/components/job/FeedbackWidget";
import Button from "@/components/shared/Button";
import Modal from "@/components/shared/Modal";
import { trackEvent } from "@/lib/posthog";
import type { Job, StudioSegment } from "@/types";

const OVERVIEW_LABEL: Record<string, string> = {
  queued: "Getting started...",
  generating_script: "Writing script...",
  generating_audio: "Recording narration...",
  creating_animations: "Animating segments...",
  rendering: "Rendering segments...",
  reviewing: "Reviewing",
  finalizing: "Combining segments...",
  ready: "Ready",
  failed: "Failed",
};

function PlayIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M8 5v14l11-7z" fill="currentColor" />
    </svg>
  );
}

function Spinner({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function JobPage() {
  const supabase = createClient();
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [segments, setSegments] = useState<StudioSegment[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(true);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [confirmingFinalize, setConfirmingFinalize] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const fetchSegments = useCallback(async () => {
    const res = await fetch(`/api/jobs/${params.id}/segments`);
    if (!res.ok) return;
    const data = await res.json();
    setSegments(data.segments);
  }, [params.id]);

  const fetchJob = useCallback(async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", authUser.id)
      .single();
    if (data) setJob(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    async function init() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/auth");
        return;
      }
      setUser({ id: authUser.id, email: authUser.email ?? "" });

      const { data } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", params.id)
        .eq("user_id", authUser.id)
        .single();
      if (data) {
        setJob(data);
        await fetchSegments();
      }
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router]);

  useEffect(() => {
    if (!params.id) return;
    const channel = supabase
      .channel(`job-${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jobs",
          filter: `id=eq.${params.id}`,
        },
        (payload) => setJob(payload.new as Job)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    if (!params.id) return;
    const channel = supabase
      .channel(`job-segments-${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "segment_status",
          filter: `job_id=eq.${params.id}`,
        },
        () => {
          fetchSegments();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.id, fetchSegments]);

  // Realtime is the fast path, but shouldn't be the only path — a dropped/unauthorized
  // websocket subscription would otherwise leave the page frozen on stale data with no
  // way to recover short of a manual refresh. Polls only while the job is still moving.
  useEffect(() => {
    if (!job || job.status === "ready" || job.status === "failed") return;
    const interval = setInterval(() => {
      fetchJob();
      fetchSegments();
    }, 6000);
    return () => clearInterval(interval);
  }, [job, fetchJob, fetchSegments]);

  useEffect(() => {
    if (job?.status !== "ready" || !job.video_url) return;
    fetch(`/api/video/${job.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.url) setFinalVideoUrl(data.url);
      })
      .catch(() => {});
  }, [job?.status, job?.video_url, job?.id]);

  const effectiveSelected = selected ?? segments[0]?.index ?? null;
  const active = segments.find((s) => s.index === effectiveSelected) ?? null;
  const anyRegenerating = segments.some((s) => s.video_status === "regenerating");

  const isPreSegments =
    job?.status === "queued" ||
    job?.status === "generating_script" ||
    job?.status === "generating_audio";
  const isReviewing = job?.status === "reviewing";
  const isFinalizing = job?.status === "finalizing";
  const isDone = job?.status === "ready";
  const isFailed = job?.status === "failed";
  const isLive = !isDone && !isFailed; // pulses the status dot while anything is in motion

  const clipStarts: number[] = [];
  segments.reduce((t, s) => {
    clipStarts.push(t);
    return t + (s.duration ?? 0);
  }, 0);

  async function regenerateSegment() {
    if (!active || !instructions.trim()) return;
    setRegenError(null);
    setSegments((prev) =>
      prev.map((s) => (s.index === active.index ? { ...s, video_status: "regenerating" } : s))
    );
    const res = await fetch(`/api/jobs/${params.id}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segment_index: active.index, instructions: instructions.trim() }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setRegenError(body.error || "Failed to start regeneration");
      await fetchSegments();
      return;
    }
    setInstructions("");
  }

  async function finalizeVideo() {
    setConfirmingFinalize(false);
    setFinalizing(true);
    setFinalizeError(null);
    const res = await fetch(`/api/jobs/${params.id}/finalize`, { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setFinalizeError(body.error || "Failed to start finalize");
      setFinalizing(false);
      return;
    }
    // Job-status realtime subscription picks up "finalizing" then "ready"/"failed" from here.
  }

  async function downloadVideo() {
    if (!job) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch(`/api/video/${job.id}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Download failed");
      }
      const { url } = await res.json();
      trackEvent("download_clicked", { job_id: job.id });
      window.location.href = url;
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <>
        <Navbar user={user} />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-gray-500">Job not found.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <Link href="/dashboard">
          <Button variant="secondary">&#8592; Back to dashboard</Button>
        </Link>

        {isFailed && (
          <div className="mt-6 rounded-lg bg-red-50 p-4 text-center">
            <p className="font-medium text-red-800">
              {job.error_message || "Generation failed. Please try again."}
            </p>
          </div>
        )}

        {finalizeError && (
          <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{finalizeError}</div>
        )}
        {downloadError && (
          <p className="mt-2 text-center text-sm text-red-600">{downloadError}</p>
        )}

        {/* Studio workbench */}
        <div className="mt-6 flex h-[75vh] min-h-[540px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-background">
          {/* Top bar */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-teal text-xs font-bold text-white">
                {(job.title || "V").charAt(0).toUpperCase()}
              </div>
              <p className="truncate text-sm font-semibold leading-tight text-foreground">
                {job.title || "Untitled video"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="flex items-center gap-1.5 rounded-full bg-teal-light px-2.5 py-1 text-[11px] font-medium text-teal-dark">
                <span
                  className={`h-1.5 w-1.5 rounded-full bg-teal ${isLive ? "animate-pulse" : ""}`}
                />
                {OVERVIEW_LABEL[job.status] ?? job.status}
              </span>
              {isDone && job.video_url && (
                <Button variant="primary" className="!px-3 !py-1.5 text-xs" disabled={downloading} onClick={downloadVideo}>
                  {downloading ? "Preparing..." : "Download"}
                </Button>
              )}
            </div>
          </div>

          {/* Main row: script dock + canvas */}
          <div className="flex min-h-0 flex-1">
            <div className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white sm:flex">
              <div className="flex items-center gap-1.5 border-b border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700">
                Script
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {segments.length === 0 ? (
                  isPreSegments ? (
                    <div className="space-y-2">
                      {[85, 70, 90, 60].map((w, i) => (
                        <div key={i} className="h-2.5 animate-pulse rounded bg-gray-100" style={{ width: `${w}%` }} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-300">No script yet.</p>
                  )
                ) : (
                  <div className="space-y-3 text-[13px] leading-relaxed text-gray-700">
                    {segments.map((s) => (
                      <p
                        key={s.index}
                        onClick={() => setSelected(s.index)}
                        className={`-mx-1 cursor-pointer rounded px-1 transition-colors hover:bg-gray-100 ${
                          s.index === effectiveSelected ? "bg-teal-light" : ""
                        }`}
                      >
                        <span className="mr-1.5 text-[10px] font-semibold text-teal">
                          {String(s.index + 1).padStart(2, "0")}
                        </span>
                        {s.narration_text ?? (
                          <span className="italic text-gray-300">Writing...</span>
                        )}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-gray-100 p-6">
              <div className="flex aspect-video w-full max-w-xl items-center justify-center overflow-hidden rounded-lg bg-gray-900 text-white shadow-lg">
                {isDone ? (
                  finalVideoUrl ? (
                    <video src={finalVideoUrl} controls className="h-full w-full" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-300">
                      <Spinner className="h-6 w-6" />
                      <span className="text-xs">Loading your video...</span>
                    </div>
                  )
                ) : isFinalizing ? (
                  <div className="flex flex-col items-center gap-2 text-gray-300">
                    <Spinner className="h-6 w-6" />
                    <span className="text-xs">Combining {segments.length} segment(s)...</span>
                  </div>
                ) : active?.video_status === "regenerating" ? (
                  <div className="flex flex-col items-center gap-2 text-gray-300">
                    <Spinner className="h-6 w-6" />
                    <span className="text-xs">Regenerating this segment...</span>
                  </div>
                ) : active?.video_url ? (
                  <video
                    key={active.video_url}
                    src={active.video_url}
                    controls
                    className="h-full w-full"
                  />
                ) : active?.video_status === "failed" ? (
                  <div className="flex flex-col items-center gap-3 text-gray-300">
                    <span className="text-xs">
                      This segment failed to render
                      {isReviewing ? " — try regenerating it below." : "."}
                    </span>
                    {active.audio_status === "ready" && active.audio_url && (
                      <audio key={active.audio_url} src={active.audio_url} controls className="h-8 w-56" />
                    )}
                  </div>
                ) : active?.audio_status === "ready" ? (
                  <div className="flex flex-col items-center gap-3 text-gray-300">
                    <Spinner className="h-6 w-6" />
                    <span className="text-xs">Animating this segment...</span>
                    {active.audio_url && (
                      <audio key={active.audio_url} src={active.audio_url} controls className="h-8 w-56" />
                    )}
                  </div>
                ) : isPreSegments ? (
                  <div className="flex flex-col items-center gap-2 text-gray-300">
                    <Spinner className="h-6 w-6" />
                    <span className="text-xs">{OVERVIEW_LABEL[job.status]}</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-500">Select a segment below</span>
                )}
              </div>

              {isReviewing && active && (
                <div className="mt-4 w-full max-w-xl">
                  <label className="text-xs font-medium text-foreground">
                    Instructions to regenerate
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="e.g. make the title bigger"
                      disabled={active.video_status === "regenerating"}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal disabled:opacity-50"
                    />
                    <Button
                      variant="outline"
                      className="!px-3 !py-1.5 text-xs"
                      onClick={regenerateSegment}
                      disabled={active.video_status === "regenerating" || !instructions.trim()}
                    >
                      {active.video_status === "regenerating" ? "Regenerating..." : "Regenerate"}
                    </Button>
                  </div>
                  {regenError && <p className="mt-2 text-xs text-red-600">{regenError}</p>}
                  <Button
                    className="mt-3 w-full"
                    onClick={() => setConfirmingFinalize(true)}
                    disabled={anyRegenerating || finalizing}
                  >
                    {finalizing ? "Starting..." : "Finalize video"}
                  </Button>
                </div>
              )}

              {isDone && user && (
                <div className="mt-4 w-full max-w-xl text-center">
                  <button
                    onClick={() => setFeedbackOpen(true)}
                    className="text-xs font-medium text-teal hover:text-teal-dark"
                  >
                    Give feedback on this video
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          {segments.length > 0 && (
            <div className="shrink-0 overflow-x-auto border-t border-gray-200 bg-white px-4 py-3">
              <div style={{ width: segments.length * 104 }}>
                <div className="mb-1.5 flex gap-2 text-[9px] text-gray-300">
                  {segments.map((s, i) => (
                    <div key={s.index} style={{ width: 96 }}>
                      {formatClock(clipStarts[i] ?? 0)}
                    </div>
                  ))}
                </div>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="w-10 shrink-0 text-[9px] font-semibold uppercase text-gray-300">
                    Video
                  </span>
                  <div className="flex gap-2">
                    {segments.map((s) => (
                      <button
                        key={s.index}
                        onClick={() => setSelected(s.index)}
                        style={{ width: 96 }}
                        className={`relative flex h-10 items-center justify-center rounded-md text-[10px] font-medium transition-all ${
                          s.index === effectiveSelected ? "ring-2 ring-teal" : ""
                        } ${
                          s.video_status === "regenerating"
                            ? "animate-pulse bg-teal-light text-teal"
                            : s.video_status === "failed"
                              ? "bg-red-100 text-red-700"
                              : s.video_status === "ready"
                                ? "bg-gray-900 text-white"
                                : s.audio_status === "ready"
                                  ? "bg-gray-500 text-gray-100"
                                  : "border border-dashed border-gray-200 bg-transparent text-gray-300"
                        }`}
                      >
                        {s.video_status === "regenerating" ? null : s.video_status === "failed" ? (
                          "!"
                        ) : s.video_status === "ready" ? (
                          <PlayIcon />
                        ) : s.audio_status === "ready" ? (
                          <Spinner />
                        ) : (
                          s.index + 1
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-10 shrink-0 text-[9px] font-semibold uppercase text-gray-300">
                    Audio
                  </span>
                  <div className="flex gap-2">
                    {segments.map((s) => (
                      <button
                        key={s.index}
                        onClick={() => setSelected(s.index)}
                        style={{ width: 96 }}
                        className={`flex h-6 items-center justify-center rounded-md text-[10px] transition-all ${
                          s.index === effectiveSelected ? "ring-2 ring-teal" : ""
                        } ${
                          s.audio_status === "ready"
                            ? "bg-teal-light text-teal-dark"
                            : "border border-dashed border-gray-200 text-gray-300"
                        }`}
                      >
                        {s.audio_status === "ready" ? "♫" : <Spinner className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Modal open={confirmingFinalize} onClose={() => setConfirmingFinalize(false)}>
        <h3 className="text-lg font-semibold text-foreground">Finalize this video?</h3>
        <p className="mt-2 text-sm text-gray-500">
          This combines all {segments.length} segments into your final video. You won&apos;t be
          able to regenerate any segment after this.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmingFinalize(false)}>
            Cancel
          </Button>
          <Button onClick={finalizeVideo}>Finalize video</Button>
        </div>
      </Modal>

      {user && (
        <Modal open={feedbackOpen} onClose={() => setFeedbackOpen(false)}>
          <FeedbackWidget jobId={job.id} userId={user.id} />
        </Modal>
      )}
    </>
  );
}
