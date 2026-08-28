import Link from "next/link";
import type { Job } from "@/types";

export const jobStatusColors: Record<string, string> = {
  queued: "bg-gray-200 text-gray-700",
  generating_script: "bg-yellow-100 text-yellow-800",
  generating_audio: "bg-yellow-100 text-yellow-800",
  creating_animations: "bg-yellow-100 text-yellow-800",
  rendering: "bg-blue-100 text-blue-800",
  reviewing: "bg-teal-light text-teal-dark",
  finalizing: "bg-blue-100 text-blue-800",
  ready: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

export const jobStatusLabels: Record<string, string> = {
  queued: "Queued",
  generating_script: "Generating script",
  generating_audio: "Generating audio",
  creating_animations: "Creating animations",
  rendering: "Rendering",
  reviewing: "Ready to review",
  finalizing: "Finalizing",
  ready: "Ready",
  failed: "Failed",
};

export default function VideoCard({ job }: { job: Job }) {
  return (
    <Link
      href={`/job/${job.id}`}
      className="block rounded-lg border border-gray-200 bg-background transition-shadow hover:shadow-md"
    >
      <div className="flex aspect-video items-center justify-center bg-gray-100 rounded-t-lg">
        {job.status === "ready" ? (
          <span className="text-sm text-teal font-medium">Video ready</span>
        ) : job.status === "reviewing" ? (
          <span className="text-sm text-teal font-medium">Ready to review</span>
        ) : (
          <span className="text-sm text-gray-500">Processing...</span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-foreground truncate">
          {job.title || "Untitled video"}
        </h3>
        <div className="mt-2 flex items-center justify-between">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${jobStatusColors[job.status] ?? jobStatusColors.queued}`}
          >
            {jobStatusLabels[job.status] ?? job.status}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(job.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Link>
  );
}
