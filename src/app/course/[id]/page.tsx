"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/shared/Navbar";
import Button from "@/components/shared/Button";
import { jobStatusColors, jobStatusLabels } from "@/components/dashboard/VideoCard";
import { getCourseProgress, type PendingTrigger } from "@/lib/courseProgress";
import type { Course, Job, BookCourseStructure, PaperCourseStructure } from "@/types";

function courseStatusLabel(status: string, isPaper: boolean): string {
  if (status === "building_structure")
    return isPaper ? "Planning your paper..." : "Planning course...";
  if (status === "complete") return isPaper ? "Paper complete" : "Course complete";
  return (
    {
      queued: "Queued",
      structure_ready: "In progress",
      quota_exceeded: "Quota reached",
      failed: "Failed",
    }[status] ?? status
  );
}

export default function CoursePage() {
  const supabase = createClient();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [courseJobs, setCourseJobs] = useState<Job[]>([]);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  // Set right after a successful trigger POST and held until the job row at that position
  // actually changes to a different id (see courseProgress.ts) — Modal's spawn is async, so
  // there's a window where either no row exists yet (first generation) or the old failed
  // row is still what's in Supabase (retry). Without this, a page remount or slow realtime
  // delivery in that window would show the button again and let it be double-triggered.
  const [pendingTrigger, setPendingTrigger] = useState<PendingTrigger | null>(null);

  const loadJobs = useCallback(
    async (courseId: string) => {
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .eq("course_id", courseId)
        .order("video_index", { ascending: true });
      if (data) setCourseJobs(data);
    },
    [supabase]
  );

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
        .from("courses")
        .select("*")
        .eq("id", params.id)
        .eq("user_id", authUser.id)
        .single();
      if (data) {
        setCourse(data);
        await loadJobs(data.id);
      }
      setLoading(false);
    }
    init();
  }, [params.id, router, supabase, loadJobs]);

  useEffect(() => {
    if (!params.id) return;
    const channel = supabase
      .channel(`course-${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "courses",
          filter: `id=eq.${params.id}`,
        },
        (payload) => {
          setCourse(payload.new as Course);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
          filter: `course_id=eq.${params.id}`,
        },
        () => {
          loadJobs(params.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.id, supabase, loadJobs]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <>
        <Navbar user={user} />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-gray-500">Course not found.</p>
        </main>
      </>
    );
  }

  const isPaper = course.source_type === "paper";
  const videos = course.course_structure
    ? isPaper
      ? (course.course_structure as PaperCourseStructure).parts
      : (course.course_structure as BookCourseStructure).videos
    : [];
  // course_structure's array is ordered but its "index" field is author-assigned metadata,
  // not the wire index — position in this array is what jobs.video_index actually matches.
  const { jobByPosition, readyCount, nextPosition, canGenerateNext, isRetry, firstVideoStarting } =
    getCourseProgress(videos, courseJobs, course.status, pendingTrigger);
  const unitLabel = isPaper ? "part" : "video";

  async function handleGenerateNext() {
    if (!course) return;
    setTriggering(true);
    setTriggerError(null);
    const priorJobId = jobByPosition.get(nextPosition)?.id ?? null;
    const resp = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: isPaper ? "paper_next" : "course_next",
        course_id: course.id,
        video_index: nextPosition,
      }),
    });
    if (!resp.ok) {
      setTriggerError(
        isRetry
          ? `Failed to retry this ${unitLabel}. Try again.`
          : `Failed to start the next ${unitLabel}. Try again.`
      );
    } else {
      setPendingTrigger({ position: nextPosition, priorJobId });
      await loadJobs(course.id);
    }
    setTriggering(false);
  }

  return (
    <>
      <Navbar user={user} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <Link href="/dashboard">
          <Button variant="secondary">&#8592; Back to dashboard</Button>
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-foreground">
          {course.title || "Untitled course"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {courseStatusLabel(course.status, isPaper)}
          {videos.length > 0 && ` · ${readyCount}/${videos.length} ${unitLabel}s ready`}
        </p>

        {course.status === "building_structure" && (
          <p className="mt-4 text-sm text-gray-500">
            {isPaper
              ? "We're reading your paper and planning its parts. This can take a few minutes — this page updates automatically."
              : "We're reading your book and planning the course. This can take a few minutes — this page updates automatically."}
          </p>
        )}

        {course.status === "structure_ready" && firstVideoStarting && (
          <p className="mt-4 text-sm text-gray-500">
            Starting your first {unitLabel} — this page updates automatically.
          </p>
        )}

        {course.status === "failed" && course.error_message && (
          <p className="mt-4 text-sm text-red-600">{course.error_message}</p>
        )}

        {canGenerateNext && (
          <div className="mt-6">
            <Button
              className="w-full"
              disabled={triggering}
              onClick={handleGenerateNext}
            >
              {triggering
                ? "Starting..."
                : isRetry
                  ? `Retry ${unitLabel} ${nextPosition + 1}`
                  : `Generate ${unitLabel} ${nextPosition + 1}`}
            </Button>
            {triggerError && (
              <p className="mt-2 text-center text-sm text-red-600">
                {triggerError}
              </p>
            )}
          </div>
        )}

        {videos.length > 0 && (
          <div className="mt-8 space-y-3">
            {videos.map((video, position) => {
              const job = jobByPosition.get(position);
              const videoNumber = position + 1;
              return (
                <div
                  key={position}
                  className={`rounded-lg border border-gray-200 p-4 ${
                    job ? "hover:shadow-md" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">
                        {isPaper ? "Part" : "Video"} {videoNumber}
                      </p>
                      <p className="truncate font-medium text-foreground">
                        {video.title}
                      </p>
                    </div>
                    {job ? (
                      // /job/[id] already shows the live step-by-step status (and the
                      // feedback form once ready) for any job regardless of status —
                      // no need to wait for "ready" before this becomes clickable.
                      <Link href={`/job/${job.id}`} className="ml-4 shrink-0">
                        {job.status === "ready" ? (
                          <span className="text-sm font-medium text-teal hover:underline">
                            View
                          </span>
                        ) : (
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${jobStatusColors[job.status] ?? jobStatusColors.queued}`}
                          >
                            {jobStatusLabels[job.status] ?? job.status}
                          </span>
                        )}
                      </Link>
                    ) : (
                      <span className="ml-4 shrink-0 text-xs text-gray-400">
                        Not started
                      </span>
                    )}
                  </div>
                  {job?.status === "failed" && job.error_message && (
                    <p className="mt-2 text-xs text-red-600">
                      {job.error_message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
