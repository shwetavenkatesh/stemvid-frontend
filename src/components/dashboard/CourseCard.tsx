import Link from "next/link";
import type { Course } from "@/types";

const statusColors: Record<string, string> = {
  queued: "bg-gray-200 text-gray-700",
  building_structure: "bg-yellow-100 text-yellow-800",
  structure_ready: "bg-blue-100 text-blue-800",
  quota_exceeded: "bg-red-100 text-red-800",
  complete: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  queued: "Queued",
  building_structure: "Planning course",
  structure_ready: "In progress",
  quota_exceeded: "Quota reached",
  complete: "Complete",
  failed: "Failed",
};

export default function CourseCard({ course }: { course: Course }) {
  const total = course.total_videos ?? course.course_structure?.total_videos;
  const completed = course.completed_videos ?? 0;

  return (
    <Link
      href={`/course/${course.id}`}
      className="block rounded-lg border border-gray-200 bg-background transition-shadow hover:shadow-md"
    >
      <div className="flex aspect-video items-center justify-center bg-gray-100 rounded-t-lg">
        <span className="text-sm text-gray-500">
          {total ? `${completed}/${total} videos` : "Planning course..."}
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
            {statusLabels[course.status] ?? course.status}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(course.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Link>
  );
}
