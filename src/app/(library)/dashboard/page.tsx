"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import Modal from "@/components/shared/Modal";
import GenerateForm from "@/components/dashboard/GenerateForm";
import EmptyState from "@/components/dashboard/EmptyState";
import TosGate from "@/components/dashboard/TosGate";
import PaperRow from "@/components/dashboard/PaperRow";
import Button from "@/components/shared/Button";
import type { Job, Profile } from "@/types";

// Matches BYOK_FREE_VIDEO_LIMIT in modal_app.py — a one-time lifetime grant, not
// a monthly allowance. Past this, generation requires a BYOK Anthropic key (see
// /settings) and is then uncapped.
const FREE_LIFETIME_VIDEO_LIMIT = 2;

function relativeTime(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
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

  const inReview = jobs.filter((j) => j.status === "reviewing");
  const ready = jobs.filter((j) => j.status === "ready");
  // Most recently created wins if more than one is mid-review — other
  // in-progress statuses (rendering, finalizing, etc.) have no one next
  // action to resume, so they're left off this card.
  const resumable = [...inReview].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];

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
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {inReview.length > 0
                ? `You have ${inReview.length} video${inReview.length !== 1 ? "s" : ""} ready to review.`
                : freeRemaining > 0
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

        {jobs.length === 0 ? (
          <div className="mt-10">
            <EmptyState onGenerate={() => setShowForm(true)} />
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-background p-4">
                <p className="text-xs text-gray-500">Videos</p>
                <p className="mt-1.5 text-2xl font-medium text-foreground">{jobs.length}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-background p-4">
                <p className="text-xs text-gray-500">In review</p>
                <p className="mt-1.5 text-2xl font-medium text-foreground">{inReview.length}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-background p-4">
                <p className="text-xs text-gray-500">Ready</p>
                <p className="mt-1.5 text-2xl font-medium text-foreground">{ready.length}</p>
              </div>
            </div>

            {resumable && (
              <div className="mt-7 flex items-center justify-between gap-3 rounded-xl bg-teal-light px-5 py-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-teal">
                    CONTINUE WHERE YOU LEFT OFF
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-teal-dark">
                    {resumable.title || "Untitled video"}
                  </p>
                  <p className="mt-0.5 text-xs text-teal">
                    Reviewing &middot; started {relativeTime(resumable.created_at)}
                  </p>
                </div>
                <Link href={`/job/${resumable.id}`} className="shrink-0">
                  <Button className="!px-4 !py-2 text-xs">Resume review</Button>
                </Link>
              </div>
            )}

            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Your papers
              </p>
              <div className="mt-2.5 flex flex-col gap-2">
                {jobs.map((job) => (
                  <PaperRow key={job.id} job={job} />
                ))}
              </div>
            </div>
          </>
        )}
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
              }
            }}
          />
        )}
      </Modal>
    </>
  );
}
