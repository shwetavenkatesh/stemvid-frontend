import Link from "next/link";
import type { Job, JobStatus } from "@/types";

// A simplified two-tone status presentation for the flat dashboard list --
// deliberately coarser than VideoCard's jobStatusColors/jobStatusLabels
// (which keep a distinct color per pipeline stage): the dashboard wireframe
// only distinguishes "Ready to review" (amber) and "Ready" (teal), with every
// other in-progress stage folded into a plain "Processing" pill.
export const statusPill: Record<JobStatus, { label: string; className: string }> = {
  queued: { label: "Processing", className: "bg-gray-100 text-gray-500" },
  generating_script: { label: "Processing", className: "bg-gray-100 text-gray-500" },
  generating_audio: { label: "Processing", className: "bg-gray-100 text-gray-500" },
  creating_animations: { label: "Processing", className: "bg-gray-100 text-gray-500" },
  rendering: { label: "Processing", className: "bg-gray-100 text-gray-500" },
  reviewing: { label: "Ready to review", className: "bg-amber-100 text-amber-800" },
  finalizing: { label: "Finalizing", className: "bg-gray-100 text-gray-500" },
  ready: { label: "Ready", className: "bg-teal-light text-teal" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700" },
};

export default function PaperRow({ job }: { job: Job }) {
  const pill = statusPill[job.status] ?? statusPill.queued;
  return (
    <Link
      href={`/job/${job.id}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-background px-4 py-3.5 hover:border-teal"
    >
      <span className="truncate text-sm text-foreground">
        {job.title || "Untitled video"}
      </span>
      <span className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium ${pill.className}`}>
        {pill.label}
      </span>
    </Link>
  );
}
