const personas = [
  {
    title: "Researchers",
    description:
      "Share your work visually without spending weeks on production.",
  },
  {
    title: "Educators",
    description:
      "Create precise animated content for any STEM topic.",
  },
  {
    title: "Students",
    description:
      "Understand complex papers through clear visual explanation.",
  },
];

export default function WhoItsFor() {
  return (
    <section className="bg-gray-100 px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">
          Who it&apos;s for
        </h2>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {personas.map((p) => (
            <div
              key={p.title}
              className="rounded-lg border border-gray-200 bg-background p-6"
            >
              <h3 className="text-lg font-semibold text-teal">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-500">
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
