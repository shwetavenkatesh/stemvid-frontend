"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/shared/Navbar";
import Modal from "@/components/shared/Modal";
import VideoCard from "@/components/dashboard/VideoCard";
import CourseCard from "@/components/dashboard/CourseCard";
import GenerateForm from "@/components/dashboard/GenerateForm";
import EmptyState from "@/components/dashboard/EmptyState";
import TosGate from "@/components/dashboard/TosGate";
import Button from "@/components/shared/Button";
import Link from "next/link";
import type { Job, Course, Profile } from "@/types";

// Matches BYOK_FREE_VIDEO_LIMIT in modal_app.py — a one-time lifetime grant, not
// a monthly allowance. Past this, generation requires a BYOK Anthropic key (see
// /settings) and is then uncapped.
const FREE_LIFETIME_VIDEO_LIMIT = 2;

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [acceptingTos, setAcceptingTos] = useState(false);
  // null = not checked yet (or check failed/skipped) -- fails open, since a
  // network hiccup on this check shouldn't block someone with a working key.
  const [keyValid, setKeyValid] = useState<boolean | null>(null);

  const loadJobs = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setJobs(data);
  }, []);

  const loadCourses = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("courses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setCourses(data);
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

      if (profileData?.anthropic_api_key_id) {
        // Once per browser session, not once per dashboard mount -- the
        // dashboard is the one page every login path lands on, but it also
        // re-mounts on every later visit within the same session, and this
        // check does a live call to Anthropic that shouldn't fire that often.
        const cached = sessionStorage.getItem("byok_key_valid");
        if (cached !== null) {
          setKeyValid(cached === "true");
        } else {
          try {
            const res = await fetch("/api/settings/anthropic-key");
            if (res.ok) {
              const data = await res.json();
              const valid = !!data.keyValid;
              setKeyValid(valid);
              sessionStorage.setItem("byok_key_valid", String(valid));
            }
          } catch {
            // Leave keyValid at null (fail open) -- a network hiccup here
            // shouldn't block someone with a perfectly good key.
          }
        }
      }

      await Promise.all([loadJobs(authUser.id), loadCourses(authUser.id)]);
      setLoading(false);
    }
    init();
  }, [router, loadJobs, loadCourses]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  const tier = profile?.tier ?? "free";
  const hasByokKey = !!profile?.anthropic_api_key_id;
  // keyValid is only meaningful once a key is on file -- null (not checked, or
  // check failed) is treated as "assume fine," matching modal_app.py's own
  // fail-open on a network hiccup during the live Anthropic check.
  const byokKeyDead = hasByokKey && keyValid === false;
  // jobs is every job row this user has ever had (loadJobs has no date filter),
  // one row per generated video/chapter/part — the same count modal_app.py's
  // _lifetime_video_count uses to gate generation.
  const lifetimeVideos = jobs.length;
  const freeRemaining = Math.max(0, FREE_LIFETIME_VIDEO_LIMIT - lifetimeVideos);
  const canGenerate = freeRemaining > 0 || (hasByokKey && !byokKeyDead);

  async function handleAgreeTos() {
    if (!user) return;
    setAcceptingTos(true);
    const acceptedAt = new Date().toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({ accepted_tos_at: acceptedAt })
      .eq("id", user.id);
    setAcceptingTos(false);
    if (!error) {
      setProfile((p) => (p ? { ...p, accepted_tos_at: acceptedAt } : p));
    }
  }

  async function handleLogoutFromGate() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <>
      {profile && !profile.accepted_tos_at && (
        <TosGate
          onAgree={handleAgreeTos}
          onLogout={handleLogoutFromGate}
          loading={acceptingTos}
        />
      )}
      <Navbar user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {freeRemaining > 0
                ? `${freeRemaining} free video${freeRemaining !== 1 ? "s" : ""} remaining`
                : hasByokKey
                  ? byokKeyDead
                    ? "Your Anthropic API key isn't working anymore"
                    : "Generating with your own Anthropic API key"
                  : "Free videos used"}
            </p>
          </div>
          {canGenerate ? (
            <Button onClick={() => setShowForm(true)}>
              Generate new video
            </Button>
          ) : (
            <Link
              href="/settings"
              className="text-sm font-medium text-teal hover:underline"
            >
              {byokKeyDead
                ? "Update your Anthropic API key to keep generating"
                : "Add your Anthropic API key to keep generating"}
            </Link>
          )}
        </div>

        {(() => {
          // source_type didn't exist before papers could land in courses — every
          // pre-existing row predates the column, so null/undefined means "book".
          const books = courses.filter((c) => c.source_type !== "paper");
          const paperCourses = courses.filter((c) => c.source_type === "paper");
          const standaloneJobs = jobs.filter((job) => !job.course_id);
          const hasPapers = paperCourses.length > 0 || standaloneJobs.length > 0;
          const isEmpty = books.length === 0 && !hasPapers;
          return isEmpty ? (
            <div className="mt-10">
              <EmptyState onGenerate={() => setShowForm(true)} />
            </div>
          ) : (
            <>
              {books.length > 0 && (
                <div className="mt-10">
                  <h2 className="text-lg font-semibold text-foreground">
                    Books
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Long PDFs with a table of contents, split into a full video course.
                  </p>
                  <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {books.map((course) => (
                      <CourseCard key={course.id} course={course} />
                    ))}
                  </div>
                </div>
              )}
              {hasPapers && (
                <div className="mt-10">
                  <h2 className="text-lg font-semibold text-foreground">
                    Papers
                  </h2>
                  <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {paperCourses.map((course) => (
                      <CourseCard key={course.id} course={course} />
                    ))}
                    {standaloneJobs.map((job) => (
                      <VideoCard key={job.id} job={job} />
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </main>

      <Modal open={showForm} onClose={() => setShowForm(false)}>
        {user && (
          <GenerateForm
            userId={user.id}
            tier={tier}
            onCreated={() => {
              setShowForm(false);
              if (user) {
                loadJobs(user.id);
                loadCourses(user.id);
              }
            }}
          />
        )}
      </Modal>
    </>
  );
}
