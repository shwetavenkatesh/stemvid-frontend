export default function UnlimitedComingSoon() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-2xl rounded-lg border border-gray-200 bg-gray-100 p-8 text-center">
        <span className="inline-block rounded-full bg-teal/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-teal">
          Coming soon
        </span>
        <h2 className="mt-4 text-2xl font-bold text-foreground md:text-3xl">
          Unlimited
        </h2>
        <p className="mt-3 text-gray-500">
          Free, bring your own Anthropic API key. Create more videos, edit your
          own script, and add your own voice or choose from multiple voices.
        </p>
        <a
          href="#contact"
          className="mt-6 inline-block text-sm font-medium text-teal hover:text-teal-dark"
        >
          Sign up for early access &rarr;
        </a>
      </div>
    </section>
  );
}
