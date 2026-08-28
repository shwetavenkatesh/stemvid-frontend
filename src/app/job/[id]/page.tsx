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

const STAGE_LABEL: Record<string, string> = {
  queued: "Getting your video started...",
  generating_script: "Writing your script...",
  generating_audio: "Recording narration...",
  creating_animations: "Drawing your animations...",
  rendering: "Rendering your segments...",
};

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

  const fetchSegments = useCallback(async () => {
    const res = await fetch(`/api/jobs/${params.id}/segments`);
    if (!res.ok) return;
    const data = await res.json();
    setSegments(data.segments);
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

  const effectiveSelected = selected ?? segments[0]?.index ?? null;
  const active = segments.find((s) => s.index === effectiveSelected) ?? null;
  const anyRegenerating = segments.some((s) => s.video_status === "regenerating");

  const isPreSegments =
    job?.status === "queued" ||
    job?.status === "generating_script" ||
    job?.status === "generating_audio";
  const isGenerating = job?.status === "creating_animations" || job?.status === "rendering";
  const isReviewing = job?.status === "reviewing";
  const isFinalizing = job?.status === "finalizing";
  const isDone = job?.status === "ready";
  const isFailed = job?.status === "failed";
  const showSegmentStrip = segments.length > 0;
  const showReviewControls = isReviewing;

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
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <Link href="/dashboard">
          <Button variant="secondary">&#8592; Back to dashboard</Button>
        </Link>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{job.title || "Untitled video"}</h1>
            {showSegmentStrip && (
              <p className="mt-1 text-sm text-gray-500">{segments.length} segment(s)</p>
            )}
          </div>

          {isReviewing && (
            <Button
              onClick={() => setConfirmingFinalize(true)}
              disabled={anyRegenerating || finalizing}
            >
              {finalizing ? "Starting..." : "Finalize video"}
            </Button>
          )}
          {isDone && job.video_url && (
            <Button disabled={downloading} onClick={downloadVideo}>
              {downloading ? "Preparing download..." : "Download video"}
            </Button>
          )}
        </div>

        {isFailed && (
          <div className="mt-6 rounded-lg bg-red-50 p-4 text-center">
            <p className="font-medium text-red-800">
              {job.error_message || "Generation failed. Please try again."}
            </p>
          </div>
        )}

        {(isGenerating || isPreSegments) && (
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-100 p-6 text-center">
            <p className="font-medium text-foreground">
              {STAGE_LABEL[job.status] || "Working on your video..."}
            </p>
            {isGenerating && (
              <p className="mt-1 text-sm text-gray-500">
                {segments.length > 0
                  ? `${segments.length} segment(s) ready so far — more on the way.`
                  : "Segments will appear here as they're ready."}
              </p>
            )}
          </div>
        )}

        {isFinalizing && (
          <div className="mt-6 rounded-md bg-teal-light px-4 py-3 text-center text-sm text-teal-dark">
            Combining segments into your final video — this page will update automatically.
          </div>
        )}

        {finalizeError && (
          <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{finalizeError}</div>
        )}
        {downloadError && (
          <p className="mt-2 text-center text-sm text-red-600">{downloadError}</p>
        )}

        {showSegmentStrip && (
          <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
            {segments.map((s) => {
              const isSelected = s.index === effectiveSelected;
              return (
                <button
                  key={s.index}
                  onClick={() => setSelected(s.index)}
                  className={`flex shrink-0 flex-col items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                    isSelected
                      ? "border-teal bg-teal-light text-teal-dark"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                      s.video_status === "regenerating"
                        ? "animate-pulse bg-teal-light text-teal"
                        : s.video_status === "failed"
                          ? "bg-red-100 text-red-700"
                          : s.video_status === "pending"
                            ? "border border-dashed border-gray-300 text-gray-300"
                            : isSelected
                              ? "bg-teal text-white"
                              : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {s.index + 1}
                  </span>
                  <span>Seg {s.index + 1}</span>
                </button>
              );
            })}
            {isGenerating && (
              <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-300">
                <span className="animate-pulse">more coming...</span>
              </div>
            )}
          </div>
        )}

        {active && (
          <div className="mt-6 rounded-lg border border-gray-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-foreground">Segment {active.index + 1}</h2>
              {active.video_status === "regenerating" && (
                <span className="rounded-full bg-teal-light px-2.5 py-0.5 text-xs font-medium text-teal">
                  Regenerating...
                </span>
              )}
              {active.video_status === "failed" && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                  Regeneration failed
                </span>
              )}
            </div>

            <div className="mt-4 aspect-video overflow-hidden rounded-md bg-gray-900">
              {active.video_status === "regenerating" ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-gray-300">Regenerating this segment...</p>
                </div>
              ) : active.video_url ? (
                <video key={active.video_url} src={active.video_url} controls className="h-full w-full" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-gray-300">
                    {active.audio_status === "ready" ? "Animating this segment..." : "Not ready yet..."}
                  </p>
                </div>
              )}
            </div>

            {showReviewControls && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-foreground">
                  Instructions to regenerate
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. make the title bigger and give it more space"
                  rows={3}
                  disabled={active.video_status === "regenerating"}
                  className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal disabled:opacity-50"
                />
                {regenError && <p className="mt-2 text-sm text-red-600">{regenError}</p>}
                <div className="mt-3">
                  <Button
                    variant="outline"
                    onClick={regenerateSegment}
                    disabled={active.video_status === "regenerating" || !instructions.trim()}
                  >
                    {active.video_status === "regenerating" ? "Regenerating..." : "Regenerate segment"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {isDone && user && (
          <div className="mt-8">
            <FeedbackWidget jobId={job.id} userId={user.id} />
          </div>
        )}
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
    </>
  );
}
