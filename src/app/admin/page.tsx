"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/shared/Navbar";
import type { Job } from "@/types";

const ADMIN_EMAIL = "shwets.ven@gmail.com";

interface Stats {
  totalUsers: number;
  totalJobs: number;
  jobsToday: number;
  thumbsUp: number;
  thumbsDown: number;
}

interface AdminJob extends Job {
  profiles?: { email: string } | null;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(true);

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

      const now = new Date();
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

      const [usersRes, jobsRes, todayRes, upRes, downRes, allJobsRes] =
        await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("jobs").select("id", { count: "exact", head: true }),
          supabase
            .from("jobs")
            .select("id", { count: "exact", head: true })
            .gte("created_at", todayStart.toISOString()),
          supabase
            .from("feedback")
            .select("id", { count: "exact", head: true })
            .eq("rating", "thumbs_up"),
          supabase
            .from("feedback")
            .select("id", { count: "exact", head: true })
            .eq("rating", "thumbs_down"),
          supabase
            .from("jobs")
            .select("*, profiles(email)")
            .order("created_at", { ascending: false })
            .limit(100),
        ]);

      setStats({
        totalUsers: usersRes.count ?? 0,
        totalJobs: jobsRes.count ?? 0,
        jobsToday: todayRes.count ?? 0,
        thumbsUp: upRes.count ?? 0,
        thumbsDown: downRes.count ?? 0,
      });

      if (allJobsRes.data) setJobs(allJobsRes.data);
      setLoading(false);
    }
    init();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Navbar user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-bold text-foreground">Admin</h1>

        {stats && (
          <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Total users" value={stats.totalUsers} />
            <StatCard label="Total videos" value={stats.totalJobs} />
            <StatCard label="Videos today" value={stats.jobsToday} />
            <StatCard label="Thumbs up" value={stats.thumbsUp} />
            <StatCard label="Thumbs down" value={stats.thumbsDown} />
          </div>
        )}

        <div className="mt-10">
          <h2 className="text-lg font-semibold text-foreground">All jobs</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="pb-3 pr-4 font-medium">Title</th>
                  <th className="pb-3 pr-4 font-medium">User</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Created</th>
                  <th className="pb-3 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const duration =
                    job.completed_at && job.created_at
                      ? Math.round(
                          (new Date(job.completed_at).getTime() -
                            new Date(job.created_at).getTime()) /
                            60000
                        )
                      : null;
                  return (
                    <tr
                      key={job.id}
                      className="border-b border-gray-100"
                    >
                      <td className="py-3 pr-4 font-medium text-foreground">
                        {job.title || "Untitled"}
                      </td>
                      <td className="py-3 pr-4 text-gray-500">
                        {job.profiles?.email ?? "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="capitalize text-gray-700">
                          {job.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-500">
                        {new Date(job.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 text-gray-500">
                        {duration !== null ? `${duration}m` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {jobs.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-500">
                No jobs yet.
              </p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-background p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
