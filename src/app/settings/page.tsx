"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/shared/Navbar";
import Button from "@/components/shared/Button";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasKey, setHasKey] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

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

      const res = await fetch("/api/settings/anthropic-key");
      if (res.ok) {
        const data = await res.json();
        setHasKey(data.hasKey);
      }
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveKey() {
    if (!keyInput.trim()) return;
    setSaving(true);
    setError(null);
    setJustSaved(false);
    try {
      const res = await fetch("/api/settings/anthropic-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyInput.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Failed to save key");
        return;
      }
      // Never redisplay the value once saved — clear the field and show connected
      // status instead. There is no way to view it again after this point, by design.
      setKeyInput("");
      setHasKey(true);
      setJustSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function removeKey() {
    setRemoving(true);
    setError(null);
    setJustSaved(false);
    try {
      const res = await fetch("/api/settings/anthropic-key", { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Failed to remove key");
        return;
      }
      setHasKey(false);
    } finally {
      setRemoving(false);
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
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>

        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-foreground">Your Anthropic API key</h2>
          <p className="mt-1.5 text-sm text-gray-500">
            Your first 2 videos each month run on us. Past that, add your own Anthropic
            API key here to keep generating — your key is used only for your own jobs
            and is never shown again once saved.
          </p>
          <p className="mt-1.5 text-sm text-gray-500">
            Don&apos;t have a key yet?{" "}
            <a
              href="https://console.anthropic.com/account/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-teal hover:text-teal-dark"
            >
              Create one in the Anthropic Console
            </a>
            .
          </p>

          <div className="mt-5">
            {hasKey ? (
              <div className="flex items-center justify-between rounded-md bg-teal-light px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-medium text-teal-dark">
                  <span className="h-2 w-2 rounded-full bg-teal" />
                  API key connected
                </span>
                <Button
                  variant="outline"
                  className="!px-3 !py-1.5 text-xs"
                  onClick={removeKey}
                  disabled={removing}
                >
                  {removing ? "Removing..." : "Remove"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No key connected yet.</p>
            )}

            <div className="mt-4 flex gap-2">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={hasKey ? "Enter a new key to replace it" : "sk-ant-..."}
                autoComplete="off"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
              />
              <Button onClick={saveKey} disabled={saving || !keyInput.trim()}>
                {saving ? "Validating..." : hasKey ? "Replace key" : "Save key"}
              </Button>
            </div>

            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            {justSaved && !error && (
              <p className="mt-2 text-xs text-teal-dark">Key saved and validated.</p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
