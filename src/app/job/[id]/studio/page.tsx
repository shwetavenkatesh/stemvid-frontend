"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/shared/Navbar";
import Button from "@/components/shared/Button";
import Modal from "@/components/shared/Modal";
import type { Job, StudioSegment } from "@/types";

export default function StudioPage() {
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
  // Once true, stays true — disambiguates job.status === "rendering" meaning
  // "finalize concat in progress" from "first-ever render, never reviewed."
  const [hasReviewed, setHasReviewed] = useState(false);

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
        if (data.status === "reviewing") setHasReviewed(true);
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
      .channel(`studio-job-${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jobs",
          filter: `id=eq.${params.id}`,
        },
        (payload) => {
          const updated = payload.new as Job;
          setJob(updated);
          if (updated.status === "reviewing") setHasReviewed(true);
        }
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
      .channel(`studio-segments-${params.id}`)
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
  const anyRegenerating = segments.some((s) => s.status === "regenerating");
  const isFinalizing = hasReviewed && job?.status === "rendering";
  const notReadyYet =
    !!job && job.status !== "reviewing" && job.status !== "ready" && job.status !== "failed" && !hasReviewed;

  async function regenerateSegment() {
    if (!active || !instructions.trim()) return;
    setRegenError(null);
    setSegments((prev) =>
      prev.map((s) => (s.index === active.index ? { ...s, status: "regenerating" } : s))
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
    // Job-status realtime subscription picks up "rendering" then "ready"/"failed" from here.
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

  if (notReadyYet || job.status === "ready" || job.status === "failed") {
    return (
      <>
        <Navbar user={user} />
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10 text-center">
          <h1 className="text-2xl font-bold text-foreground">{job.title || "Untitled video"}</h1>
          <p className="mt-4 text-gray-500">
            {job.status === "ready"
              ? "This video has already been finalized."
              : job.status === "failed"
                ? "This job failed."
                : "This video isn't ready for review yet."}
          </p>
          <Link href={`/job/${job.id}`} className="mt-6 inline-block">
            <Button variant="secondary">Go to video page</Button>
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{job.title || "Untitled video"}</h1>
            <p className="mt-1 text-sm text-gray-500">{segments.length} segments</p>
          </div>
          <Button
            onClick={() => setConfirmingFinalize(true)}
            disabled={anyRegenerating || finalizing || isFinalizing}
          >
            {isFinalizing ? "Finalizing..." : finalizing ? "Starting..." : "Finalize video"}
          </Button>
        </div>

        {finalizeError && (
          <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{finalizeError}</div>
        )}
        {isFinalizing && (
          <div className="mt-4 rounded-md bg-teal-light px-4 py-3 text-sm text-teal-dark">
            Combining segments into your final video — this page will update automatically.
          </div>
        )}

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
                    s.status === "regenerating"
                      ? "animate-pulse bg-teal-light text-teal"
                      : s.status === "failed"
                        ? "bg-red-100 text-red-700"
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
        </div>

        {active && (
          <div className="mt-6 rounded-lg border border-gray-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-foreground">Segment {active.index + 1}</h2>
              {active.status === "regenerating" && (
                <span className="rounded-full bg-teal-light px-2.5 py-0.5 text-xs font-medium text-teal">
                  Regenerating...
                </span>
              )}
              {active.status === "failed" && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                  Regeneration failed
                </span>
              )}
            </div>

            <div className="mt-4 aspect-video overflow-hidden rounded-md bg-gray-900">
              {active.status === "regenerating" ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-gray-300">Regenerating this segment...</p>
                </div>
              ) : (
                <video key={active.video_url} src={active.video_url} controls className="h-full w-full" />
              )}
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-foreground">
                Instructions to regenerate
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. make the title bigger and give it more space"
                rows={3}
                disabled={active.status === "regenerating" || isFinalizing}
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal disabled:opacity-50"
              />
              {regenError && <p className="mt-2 text-sm text-red-600">{regenError}</p>}
              <div className="mt-3">
                <Button
                  variant="outline"
                  onClick={regenerateSegment}
                  disabled={active.status === "regenerating" || !instructions.trim() || isFinalizing}
                >
                  {active.status === "regenerating" ? "Regenerating..." : "Regenerate segment"}
                </Button>
              </div>
            </div>
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
