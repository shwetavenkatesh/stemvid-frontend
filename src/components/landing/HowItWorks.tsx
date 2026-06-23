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
    title: "Receive your video in 10-15 minutes",
    description:
      "Download your precise, code-rendered animated explainer — ready to share.",
  },
];

export default function HowItWorks() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">
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
