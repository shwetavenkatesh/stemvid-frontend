import Link from "next/link";
import Button from "@/components/shared/Button";
import type { Job } from "@/types";

function relativeTime(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

export default function DashboardOverview({ jobs }: { jobs: Job[] }) {
  const inReview = jobs.filter((j) => j.status === "reviewing");
  const ready = jobs.filter((j) => j.status === "ready");

  // The single actionable "pick up here" case is a job actually waiting on a
  // review decision — other in-progress statuses (rendering, finalizing, etc.)
  // have no one next action to resume, so they're left off this card. Most
  // recently created wins if more than one is mid-review.
  const resumable = [...inReview].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];

  return (
    <div className="mt-8">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-xs text-gray-500">Videos</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{jobs.length}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-xs text-gray-500">In review</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{inReview.length}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-xs text-gray-500">Ready</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{ready.length}</p>
        </div>
      </div>

      {resumable && (
        <div className="mt-8">
          <p className="text-xs text-gray-500">Continue where you left off</p>
          <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-teal bg-gray-50 px-4 py-3.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {resumable.title || "Untitled video"}
              </p>
              <p className="mt-0.5 text-xs text-teal-dark">
                Reviewing · started {relativeTime(resumable.created_at)}
              </p>
            </div>
            <Link href={`/job/${resumable.id}`} className="shrink-0">
              <Button variant="outline" className="!px-3 !py-1.5 text-xs">
                Resume review
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
