"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/shared/Navbar";
import StatusTracker from "@/components/job/StatusTracker";
import FeedbackWidget from "@/components/job/FeedbackWidget";
import Button from "@/components/shared/Button";
import { trackEvent } from "@/lib/posthog";
import type { Job } from "@/types";

export default function JobPage() {
  const supabase = createClient();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

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
      if (data) setJob(data);
      setLoading(false);
    }
    init();
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
        (payload) => {
          setJob(payload.new as Job);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.id]);

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
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-bold text-foreground">
          {job.title || "Untitled video"}
        </h1>

        <div className="mt-8 rounded-lg border border-gray-200 bg-gray-100 p-8">
          <StatusTracker status={job.status} />
        </div>

        {job.status === "ready" && job.video_url && (
          <div className="mt-8">
            <Button
              className="w-full"
              disabled={downloading}
              onClick={async () => {
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
                  setDownloadError(
                    err instanceof Error ? err.message : "Download failed"
                  );
                } finally {
                  setDownloading(false);
                }
              }}
            >
              {downloading ? "Preparing download..." : "Download Video"}
            </Button>
            {downloadError && (
              <p className="mt-2 text-center text-sm text-red-600">
                {downloadError}
              </p>
            )}
          </div>
        )}

        {job.status === "ready" && user && (
          <div className="mt-8">
            <FeedbackWidget jobId={job.id} userId={user.id} />
          </div>
        )}

        <div className="mt-10">
          <Link href="/dashboard">
            <Button variant="secondary">
              &#8592; Back to dashboard
            </Button>
          </Link>
        </div>
      </main>
    </>
  );
}
