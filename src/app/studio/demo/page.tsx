"use client";

import { useState } from "react";
import Navbar from "@/components/shared/Navbar";
import Button from "@/components/shared/Button";
import Modal from "@/components/shared/Modal";

type SegmentStatus = "rendered" | "regenerating";

interface Segment {
  index: number;
  title: string;
  status: SegmentStatus;
  renderedAgo: string;
  attempt: number;
}

const TOTAL_SEGMENTS = 18;

const SEGMENT_TITLES: Record<number, string> = {
  1: "Why attention replaced recurrence",
  2: "The transformer architecture at a glance",
  3: "Encoder and decoder stacks",
  4: "Input embeddings and positional encoding",
  5: "Scaled dot-product attention",
  6: "Multi-head attention",
  7: "Why we scale by the square root of d_k",
  8: "Self-attention vs. encoder-decoder attention",
};

function makeInitialSegments(): Segment[] {
  return Array.from({ length: TOTAL_SEGMENTS }, (_, i) => {
    const index = i + 1;
    return {
      index,
      title: SEGMENT_TITLES[index] ?? `Segment ${index}`,
      status: "rendered",
      renderedAgo: `${(index % 5) + 1} min ago`,
      attempt: 1,
    };
  });
}

export default function StudioDemoPage() {
  const [segments, setSegments] = useState<Segment[]>(makeInitialSegments);
  const [selected, setSelected] = useState(5);
  const [instructions, setInstructions] = useState("");
  const [exportState, setExportState] = useState<
    "idle" | "exporting" | "done"
  >("idle");
  const [confirmingFinalize, setConfirmingFinalize] = useState(false);

  const active = segments.find((s) => s.index === selected)!;
  const anyRegenerating = segments.some((s) => s.status === "regenerating");

  function regenerateSegment() {
    setSegments((prev) =>
      prev.map((s) =>
        s.index === selected ? { ...s, status: "regenerating" } : s
      )
    );
    setTimeout(() => {
      setSegments((prev) =>
        prev.map((s) =>
          s.index === selected
            ? {
                ...s,
                status: "rendered",
                renderedAgo: "just now",
                attempt: s.attempt + 1,
              }
            : s
        )
      );
      setInstructions("");
    }, 1600);
  }

  function finalizeVideo() {
    setConfirmingFinalize(false);
    setExportState("exporting");
    setTimeout(() => setExportState("done"), 1800);
  }

  return (
    <>
      <Navbar user={{ email: "demo@stemvid.ai" }} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Attention is all you need
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {TOTAL_SEGMENTS} segments
            </p>
          </div>
          <Button
            onClick={() => setConfirmingFinalize(true)}
            disabled={anyRegenerating || exportState !== "idle"}
          >
            {exportState === "exporting"
              ? "Finalizing..."
              : exportState === "done"
                ? "Finalized"
                : "Finalize video"}
          </Button>
        </div>

        {exportState === "done" && (
          <div className="mt-4 rounded-md bg-teal-light px-4 py-3 text-sm text-teal-dark">
            Video finalized — your download will be ready shortly.
          </div>
        )}

        {/* Segment strip */}
        <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
          {segments.map((s) => {
            const isSelected = s.index === selected;
            return (
              <button
                key={s.index}
                onClick={() => setSelected(s.index)}
                className={`flex shrink-0 flex-col items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                  isSelected
                    ? "border-teal bg-teal-light text-teal-dark"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                    s.status === "regenerating"
                      ? "animate-pulse bg-teal-light text-teal"
                      : isSelected
                        ? "bg-teal text-white"
                        : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {s.index}
                </span>
                <span>Seg {s.index}</span>
              </button>
            );
          })}
        </div>

        {/* Active segment panel */}
        <div className="mt-6 rounded-lg border border-gray-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              Segment {active.index} — {active.title}
            </h2>
            {active.status === "regenerating" ? (
              <span className="rounded-full bg-teal-light px-2.5 py-0.5 text-xs font-medium text-teal">
                Regenerating...
              </span>
            ) : (
              <span className="text-xs text-gray-500">
                Rendered {active.renderedAgo} · attempt {active.attempt}
              </span>
            )}
          </div>

          <div className="mt-4 flex aspect-video items-center justify-center rounded-md bg-gray-700">
            {active.status === "regenerating" ? (
              <p className="text-sm text-gray-300">Regenerating this segment...</p>
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90">
                <svg
                  viewBox="0 0 24 24"
                  className="ml-1 h-6 w-6 fill-foreground"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            )}
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-foreground">
              Instructions to regenerate
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. make the Q/K/V boxes bigger and space them out"
              rows={3}
              disabled={active.status === "regenerating"}
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal disabled:opacity-50"
            />
            <div className="mt-3">
              <Button
                variant="outline"
                onClick={regenerateSegment}
                disabled={active.status === "regenerating"}
              >
                {active.status === "regenerating"
                  ? "Regenerating..."
                  : "Regenerate segment"}
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Modal open={confirmingFinalize} onClose={() => setConfirmingFinalize(false)}>
        <h3 className="text-lg font-semibold text-foreground">
          Finalize this video?
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          This combines all {TOTAL_SEGMENTS} segments into your final video.
          You won&apos;t be able to regenerate any segment after this.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmingFinalize(false)}>
            Cancel
          </Button>
          <Button onClick={finalizeVideo}>Finalize video</Button>
        </div>
      </Modal>
    </>
  );
}
