import type { JobStatus } from "@/types";

const steps: { key: JobStatus; label: string }[] = [
  { key: "queued", label: "Queued" },
  { key: "generating_script", label: "Generating script" },
  { key: "creating_animations", label: "Creating animations" },
  { key: "rendering", label: "Rendering" },
  { key: "ready", label: "Ready" },
];

const stepOrder = steps.map((s) => s.key);

export default function StatusTracker({ status }: { status: JobStatus }) {
  if (status === "failed") {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-center">
        <p className="font-medium text-red-800">
          Generation failed. Please try again.
        </p>
      </div>
    );
  }

  const currentIndex = stepOrder.indexOf(status);

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={step.key} className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                done
                  ? "bg-teal text-white"
                  : active
                    ? "border-2 border-teal text-teal"
                    : "border border-gray-300 text-gray-300"
              }`}
            >
              {done ? "✓" : i + 1}
            </div>
            <span
              className={`text-sm ${
                done
                  ? "text-gray-500"
                  : active
                    ? "font-medium text-foreground"
                    : "text-gray-300"
              }`}
            >
              {step.label}
              {active && status !== "ready" && "..."}
            </span>
          </div>
        );
      })}
    </div>
  );
}
