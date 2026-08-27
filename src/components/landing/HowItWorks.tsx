const steps = [
  {
    number: "1",
    title: "Upload your PDF",
    description:
      "PDF research papers or PDF textbooks.",
  },
  {
    number: "2",
    title: "AI reads, understands, and writes an animated script",
    description:
      "Every script is verified against the source material for accuracy before rendering.",
  },
  {
    number: "3",
    title: "Review your video, scene by scene",
    description:
      "Every scene renders separately. Watch each one and regenerate any that aren't right — finalize when it's ready.",
  },
];

export default function HowItWorks() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <p className="text-center text-sm font-semibold uppercase tracking-wide text-teal">
          The process
        </p>
        <h2 className="mt-3 text-center text-2xl font-bold text-foreground md:text-3xl">
          How it works
        </h2>

        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal text-lg font-bold text-white">
                {step.number}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
