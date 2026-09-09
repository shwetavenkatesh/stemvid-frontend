"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { jobStatusColors, jobStatusLabels } from "@/components/dashboard/VideoCard";
import type { Job, Course, CourseStatus } from "@/types";

const courseStatusColors: Record<CourseStatus, string> = {
  queued: "bg-gray-200 text-gray-700",
  building_structure: "bg-yellow-100 text-yellow-800",
  structure_ready: "bg-blue-100 text-blue-800",
  quota_exceeded: "bg-red-100 text-red-800",
  complete: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

function courseStatusLabel(status: CourseStatus): string {
  if (status === "building_structure") return "Planning paper";
  return (
    {
      queued: "Queued",
      structure_ready: "In progress",
      quota_exceeded: "Quota reached",
      complete: "Complete",
      failed: "Failed",
    }[status] ?? status
  );
}

function StatusBadge({
  colorClass,
  label,
}: {
  colorClass: string;
  label: string;
}) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}

export default function LibraryRail() {
  const supabase = createClient();
  const params = useParams<{ id?: string }>();
  const selectedJobId = params?.id;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Tracks the last selectedJobId this component reacted to, so the
  // auto-expand-on-select logic below (adjusting state during render, not in
  // an effect) fires once per navigation instead of on every render.
  const [autoExpandedFor, setAutoExpandedFor] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: jobsData }, { data: coursesData }] = await Promise.all([
        supabase
          .from("jobs")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("courses")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      if (jobsData) setJobs(jobsData);
      if (coursesData) setCourses(coursesData);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A course this rail links into should default to open — otherwise landing
  // directly on /job/[id] for a part of a multi-part paper would show the rail
  // with everything collapsed and no visible way to tell which paper it's part
  // of. Adjusts state during render (same pattern job/[id]/page.tsx already
  // uses for viewingFinalStatusSeen) rather than an effect, since this is
  // exactly "reset/update local state when a prop changes."
  if (!loading && selectedJobId && selectedJobId !== autoExpandedFor) {
    setAutoExpandedFor(selectedJobId);
    const job = jobs.find((j) => j.id === selectedJobId);
    if (job?.course_id) {
      const courseId = job.course_id;
      setExpanded((prev) => (prev.has(courseId) ? prev : new Set(prev).add(courseId)));
    }
  }

  function toggleExpanded(courseId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  }

  if (loading) {
    return (
      <aside className="w-72 shrink-0 border-r border-gray-200 px-4 py-6">
        <p className="text-sm text-gray-500">Loading...</p>
      </aside>
    );
  }

  // Books are hidden from this rail for now (not deleted — course_id rows and
  // /course/[id] still work if linked directly). Only source_type === "paper"
  // renders here.
  const paperCourses = courses.filter((c) => c.source_type === "paper");
  const standaloneJobs = jobs.filter((job) => !job.course_id);
  const isEmpty = paperCourses.length === 0 && standaloneJobs.length === 0;

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-r border-gray-200 px-3 py-6">
      <h2 className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Papers
      </h2>
      {isEmpty ? (
        <p className="mt-3 px-2 text-sm text-gray-500">No videos yet.</p>
      ) : (
        <div className="mt-2 flex flex-col gap-1">
          {paperCourses.map((course) => {
            const children = jobs.filter((j) => j.course_id === course.id);
            const isOpen = expanded.has(course.id);
            const total = course.total_videos ?? undefined;
            const completed = course.completed_videos ?? 0;
            return (
              <div key={course.id}>
                <button
                  type="button"
                  onClick={() => toggleExpanded(course.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {course.title || "Untitled paper"}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {total ? `${completed}/${total} parts` : "Planning..."}
                    </p>
                  </div>
                  <StatusBadge
                    colorClass={courseStatusColors[course.status] ?? courseStatusColors.queued}
                    label={courseStatusLabel(course.status)}
                  />
                </button>
                {isOpen && children.length > 0 && (
                  <div className="ml-3 flex flex-col gap-0.5 border-l border-gray-200 pl-3">
                    {children.map((job) => (
                      <Link
                        key={job.id}
                        href={`/job/${job.id}`}
                        className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm ${
                          job.id === selectedJobId
                            ? "bg-teal-light font-medium text-teal-dark"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <span className="truncate">{job.title || "Untitled video"}</span>
                        <StatusBadge
                          colorClass={jobStatusColors[job.status] ?? jobStatusColors.queued}
                          label={jobStatusLabels[job.status] ?? job.status}
                        />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {standaloneJobs.map((job) => (
            <Link
              key={job.id}
              href={`/job/${job.id}`}
              className={`flex items-center justify-between gap-2 rounded-md px-2 py-2 ${
                job.id === selectedJobId
                  ? "bg-teal-light font-medium text-teal-dark"
                  : "hover:bg-gray-50"
              }`}
            >
              <p className="truncate text-sm font-medium text-foreground">
                {job.title || "Untitled video"}
              </p>
              <StatusBadge
                colorClass={jobStatusColors[job.status] ?? jobStatusColors.queued}
                label={jobStatusLabels[job.status] ?? job.status}
              />
            </Link>
          ))}
        </div>
      )}
    </aside>
  );
}
