"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/shared/Navbar";
import Button from "@/components/shared/Button";
import { jobStatusColors, jobStatusLabels } from "@/components/dashboard/VideoCard";
import { getCourseProgress } from "@/lib/courseProgress";
import type { Course, Job } from "@/types";

const courseStatusLabels: Record<string, string> = {
  queued: "Queued",
  building_structure: "Planning course...",
  structure_ready: "In progress",
  quota_exceeded: "Quota reached",
  complete: "Course complete",
  failed: "Failed",
};

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
  // Set right after a successful trigger POST and held until the corresponding job row
  // actually shows up via loadJobs/realtime — Modal's spawn is async, so there's a window
  // where the row doesn't exist in Supabase yet even though the video is already running.
  // Without this, a page remount or slow realtime delivery in that window would show the
  // "Generate video N" button again and let it be double-triggered.
  const [pendingPosition, setPendingPosition] = useState<number | null>(null);

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

  const videos = course.course_structure?.videos ?? [];
  // course_structure.videos is ordered but its "index" field is author-assigned metadata,
  // not the wire index — position in this array is what jobs.video_index actually matches.
  const { jobByPosition, readyCount, nextPosition, canGenerateNext, firstVideoStarting } =
    getCourseProgress(videos, courseJobs, course.status, pendingPosition);

  async function handleGenerateNext() {
    if (!course) return;
    setTriggering(true);
    setTriggerError(null);
    const resp = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "course_next",
        course_id: course.id,
        video_index: nextPosition,
      }),
    });
    if (!resp.ok) {
      setTriggerError("Failed to start the next video. Try again.");
    } else {
      setPendingPosition(nextPosition);
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
          {courseStatusLabels[course.status] ?? course.status}
          {videos.length > 0 && ` · ${readyCount}/${videos.length} videos ready`}
        </p>

        {course.status === "building_structure" && (
          <p className="mt-4 text-sm text-gray-500">
            We&apos;re reading your book and planning the course. This can take
            a few minutes — this page updates automatically.
          </p>
        )}

        {course.status === "structure_ready" && firstVideoStarting && (
          <p className="mt-4 text-sm text-gray-500">
            Starting your first video — this page updates automatically.
          </p>
        )}

        {course.status === "failed" && course.error_message && (
          <p className="mt-4 text-sm text-red-600">{course.error_message}</p>
        )}

        {videos.length > 0 && (
          <div className="mt-8 space-y-3">
            {videos.map((video, position) => {
              const job = jobByPosition.get(position);
              const videoNumber = position + 1;
              return (
                <div
                  key={position}
                  className={`flex items-center justify-between rounded-lg border border-gray-200 p-4 ${
                    job?.status === "ready" ? "hover:shadow-md" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">
                      Video {videoNumber}
                    </p>
                    <p className="truncate font-medium text-foreground">
                      {video.title}
                    </p>
                  </div>
                  {job ? (
                    job.status === "ready" ? (
                      <Link
                        href={`/job/${job.id}`}
                        className="ml-4 shrink-0 text-sm font-medium text-teal hover:underline"
                      >
                        View
                      </Link>
                    ) : (
                      <span
                        className={`ml-4 shrink-0 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${jobStatusColors[job.status] ?? jobStatusColors.queued}`}
                      >
                        {jobStatusLabels[job.status] ?? job.status}
                      </span>
                    )
                  ) : (
                    <span className="ml-4 shrink-0 text-xs text-gray-400">
                      Not started
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {canGenerateNext && (
          <div className="mt-8">
            <Button
              className="w-full"
              disabled={triggering}
              onClick={handleGenerateNext}
            >
              {triggering
                ? "Starting..."
                : `Generate video ${nextPosition + 1}`}
            </Button>
            {triggerError && (
              <p className="mt-2 text-center text-sm text-red-600">
                {triggerError}
              </p>
            )}
          </div>
        )}
      </main>
    </>
  );
}
