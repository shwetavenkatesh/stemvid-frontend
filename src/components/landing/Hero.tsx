"use client";

import Button from "@/components/shared/Button";

export default function Hero() {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl">
          Turn research papers and textbooks into animated explainer videos
        </h1>
        <p className="mt-6 text-lg text-gray-500 md:text-xl">
          AI-generated, scientifically accurate, ready in minutes. Built for
          STEM researchers, educators and students.
        </p>

        <div className="mt-10">
          <a href="#early-access">
            <Button>Get early access</Button>
          </a>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 text-sm text-gray-500 sm:flex-row sm:justify-center sm:gap-6">
          <span>
            Animations powered by{" "}
            <span className="font-medium text-foreground">Manim</span>
          </span>
          <span className="hidden sm:inline text-gray-300">|</span>
          <span>Scripts verified against source material</span>
          <span className="hidden sm:inline text-gray-300">|</span>
          <span>No hallucinations. No misrepresented research.</span>
        </div>
      </div>
    </section>
  );
}
