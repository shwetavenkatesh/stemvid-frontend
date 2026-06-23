"use client";

import { useState, useRef } from "react";
import Button from "@/components/shared/Button";
import { createClient } from "@/lib/supabase";
import { trackEvent } from "@/lib/posthog";
import type { Tier } from "@/types";

export default function GenerateForm({
  userId,
  tier,
  onCreated,
}: {
  userId: string;
  tier: Tier;
  onCreated: () => void;
}) {
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true);
    setError("");

    const filePath = `${userId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(filePath, file);

    if (uploadError) {
      setError("Failed to upload PDF. Try again.");
      setSubmitting(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("pdfs")
      .getPublicUrl(filePath);

    const { error: insertError } = await supabase.from("jobs").insert({
      user_id: userId,
      title: title || file.name.replace(/\.pdf$/i, ""),
      pdf_url: urlData.publicUrl,
      status: "queued",
    });

    if (insertError) {
      setError("Failed to create job. Try again.");
      setSubmitting(false);
      return;
    }

    trackEvent("paper_uploaded", { title, tier });
    setFile(null);
    setTitle("");
    setSubmitting(false);
    onCreated();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") {
      setFile(dropped);
      if (!title) setTitle(dropped.name.replace(/\.pdf$/i, ""));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        Generate new video
      </h2>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-teal"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setFile(f);
              if (!title) setTitle(f.name.replace(/\.pdf$/i, ""));
            }
          }}
        />
        {file ? (
          <p className="text-sm font-medium text-teal">{file.name}</p>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-700">
              Drop your PDF here or click to browse
            </p>
            <p className="mt-1 text-xs text-gray-500">
              PDF research papers and textbooks
            </p>
          </>
        )}
      </div>

      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700"
        >
          Title (optional)
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Auto-filled from PDF filename"
          className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-foreground placeholder:text-gray-300 focus:border-teal focus:outline-none"
        />
      </div>

      <p className="text-xs text-gray-500">
        Currently generating videos in 10-15 minutes. Priority processing
        coming soon for early access members.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={!file || submitting} className="w-full">
        {submitting ? "Uploading..." : "Generate video"}
      </Button>
    </form>
  );
}
