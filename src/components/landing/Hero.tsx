"use client";

export default function Hero() {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal">
          stemvid.ai
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl">
          The AI video studio for technical ideas.
        </h1>
        <p className="mt-6 text-lg text-gray-500 md:text-xl">
          Turn research papers and textbooks into a first draft in minutes,
          then refine every scene until it&apos;s ready.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 text-sm text-gray-500 sm:flex-row sm:justify-center sm:gap-6">
          <span>
            Animations powered by{" "}
            <span className="font-medium text-foreground">Manim</span>
          </span>
          <span className="hidden sm:inline text-gray-300">|</span>
          <span>Grounded in your source material</span>
          <span className="hidden sm:inline text-gray-300">|</span>
          <span>You review and approve every scene</span>
        </div>
      </div>
    </section>
  );
}
