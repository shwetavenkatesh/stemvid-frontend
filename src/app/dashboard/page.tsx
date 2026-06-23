"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/shared/Navbar";
import Modal from "@/components/shared/Modal";
import VideoCard from "@/components/dashboard/VideoCard";
import GenerateForm from "@/components/dashboard/GenerateForm";
import EmptyState from "@/components/dashboard/EmptyState";
import Button from "@/components/shared/Button";
import Link from "next/link";
import type { Job, Profile } from "@/types";

const VIDEO_LIMITS = { free: 2, pro: 7 };

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadJobs = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setJobs(data);
  }, []);

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

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();
      if (profileData) setProfile(profileData);

      await loadJobs(authUser.id);
      setLoading(false);
    }
    init();
  }, [router, loadJobs]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  const tier = profile?.tier ?? "free";
  const limit = VIDEO_LIMITS[tier];
  const used = profile?.videos_used_this_month ?? 0;
  const remaining = Math.max(0, limit - used);

  return (
    <>
      <Navbar user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              <span className="inline-block rounded-full bg-teal-light px-2.5 py-0.5 text-xs font-medium text-teal capitalize">
                {tier}
              </span>
              <span className="ml-3">
                {remaining} video{remaining !== 1 ? "s" : ""} remaining this
                month
              </span>
            </p>
          </div>
          {remaining > 0 ? (
            <Button onClick={() => setShowForm(true)}>
              Generate new video
            </Button>
          ) : (
            <Link
              href="/#contact"
              className="text-sm font-medium text-teal hover:underline"
            >
              Need more videos? We&apos;re in beta — contact us and
              we&apos;ll help you out.
            </Link>
          )}
        </div>

        <div className="mt-10">
          {jobs.length === 0 ? (
            <EmptyState onGenerate={() => setShowForm(true)} />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <VideoCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Modal open={showForm} onClose={() => setShowForm(false)}>
        {user && (
          <GenerateForm
            userId={user.id}
            tier={tier}
            onCreated={() => {
              setShowForm(false);
              if (user) loadJobs(user.id);
            }}
          />
        )}
      </Modal>
    </>
  );
}
