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
  const [contentType, setContentType] = useState<"paper" | "book">("paper");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title cannot be blank.");
      return;
    }
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

    // Papers go through the courses table too now — the concept-inventory +
    // part-split pipeline needs a courses row same as books do, not a jobs row
    // (a short paper just naturally comes back as a single part).
    const { data: recordData, error: insertError } = await supabase
      .from("courses")
      .insert({
        user_id: userId,
        title: trimmedTitle,
        pdf_url: filePath,
        status: "queued",
        // Set immediately rather than waiting on the backend's structure step to set
        // it — otherwise a brand-new row shows as a book (wrong copy) for however long
        // building_structure takes, since the frontend already knows which one this is.
        source_type: contentType,
      })
      .select("id")
      .single();

    if (insertError || !recordData) {
      setError(
        contentType === "book"
          ? "Failed to create course. Try again."
          : "Failed to create paper. Try again."
      );
      setSubmitting(false);
      return;
    }

    const triggerBody =
      contentType === "book"
        ? { type: "book", course_id: recordData.id }
        : { type: "paper_course", course_id: recordData.id };

    const triggerResp = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(triggerBody),
    });

    if (!triggerResp.ok) {
      setError(
        contentType === "book"
          ? "Course created but failed to start pipeline. Try again."
          : "Paper created but failed to start pipeline. Try again."
      );
      setSubmitting(false);
      return;
    }

    trackEvent(contentType === "book" ? "book_uploaded" : "paper_uploaded", {
      content_type: contentType,
      title: trimmedTitle,
      tier,
    });
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

      <div className="flex rounded-md border border-gray-200 p-1">
        {(["paper", "book"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setContentType(option)}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              contentType === option
                ? "bg-teal text-white"
                : "text-gray-600 hover:text-foreground"
            }`}
          >
            {option === "paper" ? "Research paper" : "Book"}
          </button>
        ))}
      </div>

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
              {contentType === "book"
                ? "Long PDFs with a table of contents — textbooks and workbooks"
                : "Anything that isn't a book — research papers or any other PDF"}
            </p>
          </>
        )}
      </div>

      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700"
        >
          Title
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
        {contentType === "book"
          ? "We'll build a full video course from your book and generate the first video in 10-15 minutes. You'll generate the rest one at a time from the course page."
          : "We'll plan your paper into one or more parts and generate the first one in 10-15 minutes. You'll generate the rest one at a time from the paper page. Priority processing coming soon for early access members."}
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={!file || submitting} className="w-full">
        {submitting
          ? "Uploading..."
          : contentType === "book"
            ? "Generate course"
            : "Generate paper"}
      </Button>
    </form>
  );
}
