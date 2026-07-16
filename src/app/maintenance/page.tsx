"use client";

import { useState } from "react";

export default function MaintenancePage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(
        body.error === "duplicate"
          ? "You're already on the list!"
          : "Something went wrong. Try again."
      );
      return;
    }

    setSubmitted(true);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <h1 className="text-3xl font-bold text-teal md:text-4xl">stemvid.ai</h1>
      <p className="mt-4 text-lg font-medium text-foreground">Coming Soon</p>
      <p className="mt-2 text-sm text-gray-500">
        Turn research papers into animated explainer videos
      </p>

      <div className="mt-10 w-full max-w-sm">
        {submitted ? (
          <p className="text-center text-sm font-medium text-teal">
            You&apos;re on the list! We&apos;ll notify you when we launch.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              required
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-gray-400 focus:border-teal focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-teal px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-dark disabled:opacity-50"
            >
              {loading ? "Joining..." : "Notify me"}
            </button>
          </form>
        )}
        {error && (
          <p className="mt-3 text-center text-sm text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
}
