import Link from "next/link";
import type { Course, BookCourseStructure, PaperCourseStructure } from "@/types";

const statusColors: Record<string, string> = {
  queued: "bg-gray-200 text-gray-700",
  building_structure: "bg-yellow-100 text-yellow-800",
  structure_ready: "bg-blue-100 text-blue-800",
  quota_exceeded: "bg-red-100 text-red-800",
  complete: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

function statusLabel(status: string, isPaper: boolean): string {
  if (status === "building_structure") return isPaper ? "Planning paper" : "Planning course";
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

export default function CourseCard({ course }: { course: Course }) {
  const isPaper = course.source_type === "paper";
  const structureTotal = course.course_structure
    ? isPaper
      ? (course.course_structure as PaperCourseStructure).total_parts
      : (course.course_structure as BookCourseStructure).total_videos
    : undefined;
  const total = course.total_videos ?? structureTotal;
  const completed = course.completed_videos ?? 0;

  return (
    <Link
      href={`/course/${course.id}`}
      className="block rounded-lg border border-gray-200 bg-background transition-shadow hover:shadow-md"
    >
      <div className="flex aspect-video items-center justify-center bg-gray-100 rounded-t-lg">
        <span className="text-sm text-gray-500">
          {total
            ? `${completed}/${total} ${isPaper ? "parts" : "videos"}`
            : isPaper
              ? "Planning paper..."
              : "Planning course..."}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-foreground truncate">
          {course.title || "Untitled course"}
        </h3>
        <div className="mt-2 flex items-center justify-between">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[course.status] ?? statusColors.queued}`}
          >
            {statusLabel(course.status, isPaper)}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(course.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Link>
  );
}
