const points = [
  {
    title: "Verified against the source",
    description:
      "Every script is checked against the original paper or textbook before a single frame is rendered. Your research is represented faithfully.",
  },
  {
    title: "Precision with Manim",
    description:
      "Animations are rendered with Manim, an engine built for precise STEM visualization. Equations, graphs and diagrams are exact — not approximations.",
  },
  {
    title: "Grounded in your source material",
    description:
      "Script content traces back to the actual paper or textbook, not the model's general knowledge. If it's not in your source, it's not in the video.",
  },
  {
    title: "No misrepresented research",
    description:
      "The model isn't allowed to editorialize, oversell, or distort what your source actually claims — and your review step is the real backstop, catching subtler distortion that grounding alone can't.",
  },
  {
    title: "You have the final say",
    description:
      "Every scene is yours to review before it's final. If something's off, tell it what to fix and regenerate that scene — nothing ships without your approval.",
  },
];

export default function WhyItsAccurate() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <p className="text-center text-sm font-semibold uppercase tracking-wide text-teal">
          Accuracy &amp; control
        </p>
        <h2 className="mt-3 text-center text-2xl font-bold text-foreground md:text-3xl">
          Why you can trust it
        </h2>
        <p className="mt-3 text-center text-gray-500">
          Accurate by design. Yours to approve.
        </p>

        <div className="mt-14 space-y-10">
          {points.map((point) => (
            <div key={point.title} className="text-center md:text-left">
              <h3 className="text-lg font-semibold text-teal">
                {point.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
