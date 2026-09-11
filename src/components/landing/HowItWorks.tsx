const steps = [
  {
    number: "1",
    title: "Upload your PDF",
    description: "Research papers or textbook chapters.",
  },
  {
    number: "2",
    title: "AI writes the script",
    description: "Checked against your source before rendering.",
  },
  {
    number: "3",
    title: "AI renders, you review",
    description: "Every scene animated — regenerate anything that's not quite right.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <p className="text-center text-sm font-semibold uppercase tracking-wide text-teal">
          The process
        </p>
        <h2 className="mt-3 text-center text-2xl font-bold text-foreground md:text-3xl">
          How it works
        </h2>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-xl border border-gray-200 bg-background p-5"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-light text-sm font-medium text-teal">
                {step.number}
              </div>
              <h3 className="mt-3 text-sm font-medium text-foreground">
                {step.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
