"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/shared/Navbar";
import Button from "@/components/shared/Button";
import type { Job } from "@/types";

const ADMIN_EMAIL = "shwets.ven@gmail.com";

export default function AdminJobPage() {
  const supabase = createClient();
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [segments, setSegments] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser || authUser.email !== ADMIN_EMAIL) {
        router.push("/dashboard");
        return;
      }

      setUser({ id: authUser.id, email: authUser.email ?? "" });

      const { data } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", params.id)
        .single();

      if (data) setJob(data);
      setLoading(false);
    }
    init();
  }, [params.id, router]);

  useEffect(() => {
    if (!params.id) return;
    const channel = supabase
      .channel(`admin-job-${params.id}`)
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
          if (payload.new.status === "ready" || payload.new.status === "failed") {
            setWorking(false);
            if (payload.new.status === "ready") {
              // Keep a success message for finalize; regen results are shown in the log panel
              setMessage((prev) =>
                prev?.includes("Finalizing") ? "Video finalized — final.mp4 updated in R2." : null
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.id]);

  async function handleRegenerate() {
    setError(null);
    setMessage(null);

    const indices = segments
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 0);

    if (indices.length === 0) {
      setError("Enter at least one valid segment number.");
      return;
    }

    setWorking(true);
    try {
      const res = await fetch(`/api/admin/jobs/${params.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segments: indices }),
      });
      if (!res.ok) {
        setWorking(false);
        setError("Failed to start regeneration.");
      } else {
        setMessage("Regenerating — segment results update below as each one completes.");
      }
    } catch {
      setWorking(false);
      setError("Network error — please try again.");
    }
  }

  async function handleFinalize() {
    setError(null);
    setMessage(null);
    setWorking(true);
    try {
      const res = await fetch(`/api/admin/jobs/${params.id}/finalize`, {
        method: "POST",
      });
      if (!res.ok) {
        setWorking(false);
        setError("Failed to start finalize.");
      } else {
        setMessage("Finalizing video — status updates automatically.");
      }
    } catch {
      setWorking(false);
      setError("Network error — please try again.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  const regenLog = job?.regen_log;
  const pending = regenLog
    ? regenLog.requested.length - regenLog.done.length - regenLog.failed.length
    : 0;

  return (
    <>
      <Navbar user={user} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <Link href="/admin" className="text-sm text-gray-500 hover:underline">
          ← Admin
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-foreground">{job?.title}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Status:{" "}
          <span className="capitalize">{job?.status.replace(/_/g, " ")}</span>
        </p>

        {regenLog && (
          <div className="mt-6 rounded border border-gray-200 p-4 text-sm">
            <p className="font-medium text-foreground">Last regeneration</p>
            {regenLog.done.length > 0 && (
              <p className="mt-2 text-gray-700">
                Done:{" "}
                <span className="font-medium">
                  {regenLog.done.join(", ")}
                </span>
              </p>
            )}
            {regenLog.failed.length > 0 && (
              <p className="mt-1 text-red-600">
                Failed:{" "}
                <span className="font-medium">
                  {regenLog.failed.join(", ")}
                </span>
              </p>
            )}
            {pending > 0 && (
              <p className="mt-1 text-gray-400">
                In progress: {pending} remaining...
              </p>
            )}
          </div>
        )}

        <div className="mt-10 space-y-3">
          <label className="block text-sm font-medium text-foreground">
            Segments to regenerate
          </label>
          <p className="text-sm text-gray-500">
            Comma-separated segment numbers matching the filename — e.g.{" "}
            <code className="text-xs">3,7,12</code> regenerates seg_03, seg_07, seg_12
          </p>
          <input
            type="text"
            value={segments}
            onChange={(e) => setSegments(e.target.value)}
            placeholder="e.g. 1,3,7"
            disabled={working}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
          />
          <Button
            onClick={handleRegenerate}
            disabled={working || !segments.trim()}
          >
            {working && message?.includes("Regenerating")
              ? "Regenerating..."
              : "Regenerate segments"}
          </Button>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8">
          <p className="text-sm text-gray-500">
            Once happy with all segments, finalize to rebuild the final video.
          </p>
          <div className="mt-3">
            <Button variant="secondary" onClick={handleFinalize} disabled={working}>
              {working && message?.includes("Finalizing")
                ? "Finalizing..."
                : "Finalize video"}
            </Button>
          </div>
        </div>

        {message && <p className="mt-6 text-sm text-gray-600">{message}</p>}
        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      </main>
    </>
  );
}
