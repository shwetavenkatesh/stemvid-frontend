"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/shared/Navbar";
import Button from "@/components/shared/Button";
import { trackEvent } from "@/lib/posthog";

const FEATURE_OPTIONS = [
  "More free videos before needing my own API key",
  "Editing the script before it's animated",
  "Choosing or uploading my own narration voice",
  "Editing the generated Manim code directly",
  "Ready-made templates for common video types",
  "Faster turnaround / priority rendering",
  "Team or shared workspace",
];

export default function FeedbackPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [featuresWanted, setFeaturesWanted] = useState<string[]>([]);
  const [topMissing, setTopMissing] = useState("");
  const [npsScore, setNpsScore] = useState<string>("");
  const [extra, setExtra] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleFeature(feature: string) {
    setFeaturesWanted((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback_type: "product",
          features_wanted: featuresWanted,
          top_missing_feature: topMissing,
          nps_score: npsScore,
          extra,
        }),
      });
      if (!res.ok) {
        setError("Failed to submit feedback. Please try again.");
        return;
      }
      trackEvent("product_feedback_submitted", { features_wanted: featuresWanted });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

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
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-bold text-foreground">Feedback</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          Not about one specific video — this is about what would make stemvid.ai
          more useful for you. We read every one of these.
        </p>

        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
          {submitted ? (
            <div className="rounded-lg bg-teal-light p-6 text-center">
              <p className="font-medium text-teal-dark">Thanks — this genuinely helps.</p>
              <p className="mt-1 text-sm text-gray-500">
                We read every submission when deciding what to build next.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Which of these would help you most? (pick any)
                </label>
                <div className="mt-2 space-y-2">
                  {FEATURE_OPTIONS.map((feature) => (
                    <label
                      key={feature}
                      className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={featuresWanted.includes(feature)}
                        onChange={() => toggleFeature(feature)}
                        className="h-4 w-4 rounded border-gray-300 text-teal focus:ring-teal"
                      />
                      {feature}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  What&apos;s the #1 thing missing for you right now?
                </label>
                <textarea
                  value={topMissing}
                  onChange={(e) => setTopMissing(e.target.value)}
                  rows={2}
                  className="mt-1.5 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-foreground placeholder:text-gray-300 focus:border-teal focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  How likely are you to recommend stemvid.ai to a colleague? (0–10)
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Array.from({ length: 11 }, (_, i) => String(i)).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNpsScore(n)}
                      className={`h-8 w-8 rounded-md text-xs font-medium transition-colors ${
                        npsScore === n
                          ? "bg-teal text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Anything else you&apos;d like to tell us?
                </label>
                <textarea
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  rows={3}
                  className="mt-1.5 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-foreground placeholder:text-gray-300 focus:border-teal focus:outline-none"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Submitting..." : "Submit feedback"}
              </Button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
