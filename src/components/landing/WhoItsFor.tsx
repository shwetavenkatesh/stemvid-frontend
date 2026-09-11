const personas = [
  {
    title: "Researchers",
    description: "Share your work visually, no production time.",
  },
  {
    title: "Educators",
    description: "Polished video content, no animation skills.",
  },
  {
    title: "Students",
    description: "Understand papers through clear visuals.",
  },
  {
    title: "Engineers",
    description: "Explain systems to teams in minutes.",
  },
];

export default function WhoItsFor() {
  return (
    <section id="who-its-for" className="bg-gray-100 px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">
          Who it&apos;s for
        </h2>

        <div className="mt-12 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {personas.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-gray-200 bg-background p-4"
            >
              <h3 className="text-sm font-medium text-teal">{p.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
