"use client";

import { useState } from "react";
import Button from "@/components/shared/Button";
import { createClient } from "@/lib/supabase";
import { trackEvent } from "@/lib/posthog";

export default function EarlyAccess() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: dbError } = await supabase
      .from("waitlist")
      .insert({ email });

    if (dbError) {
      setError(
        dbError.code === "23505"
          ? "You're already on the waitlist!"
          : "Something went wrong. Try again."
      );
      setLoading(false);
      return;
    }

    trackEvent("waitlist_signup", { email });
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <section id="early-access" className="bg-teal px-6 py-20">
      <div className="mx-auto max-w-md text-center">
        <h2 className="text-2xl font-bold text-white md:text-3xl">
          Get early access
        </h2>
        <p className="mt-3 text-teal-light/80">
          Join 50+ researchers already on the waitlist
        </p>

        {submitted ? (
          <p className="mt-8 text-sm font-medium text-white">
            You&apos;re on the list! We&apos;ll be in touch soon.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              required
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-md border-0 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:bg-white/20 focus:outline-none"
            />
            <Button
              type="submit"
              disabled={loading}
              className="bg-white text-teal hover:bg-gray-100"
            >
              {loading ? "Joining..." : "Join waitlist"}
            </Button>
          </form>
        )}
        {error && <p className="mt-3 text-sm text-red-200">{error}</p>}
      </div>
    </section>
  );
}
