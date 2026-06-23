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
    title: "No hallucinations. No misrepresented research.",
    description:
      "We don't guess, invent or embellish. If it's not in your paper, it's not in the video. Your credibility stays intact.",
  },
];

export default function WhyItsAccurate() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">
          Why it&apos;s accurate
        </h2>
        <p className="mt-3 text-center text-gray-500">
          Built for people who can&apos;t afford to get it wrong
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
