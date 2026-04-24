const TESTIMONIALS = [
  {
    quote:
      "With every application I could have a tailored resume and cover letter. That's wild.",
    author: "Chris M.",
  },
  {
    quote:
      "Wow. I'm very impressed already! I just tailored my resume to an AI Support Engineer role.",
    author: "Simon D.",
  },
  {
    quote:
      "I've truly never seen anything else that will customise a resume and cover letter in one spot.",
    author: "Adam K.",
  },
] as const;

function QuoteIcon() {
  return (
    <svg
      width="24"
      height="18"
      viewBox="0 0 24 18"
      fill="none"
      className="text-primary/40"
      aria-hidden
    >
      <path
        d="M0 18V10.8C0 7.92 0.76 5.56 2.28 3.72C3.84 1.88 6.04 0.68 8.88 0.12L9.96 2.16C8.44 2.52 7.2 3.24 6.24 4.32C5.32 5.4 4.84 6.6 4.8 7.92H8.88V18H0ZM15.12 18V10.8C15.12 7.92 15.88 5.56 17.4 3.72C18.96 1.88 21.16 0.68 24 0.12L25.08 2.16C23.56 2.52 22.32 3.24 21.36 4.32C20.44 5.4 19.96 6.6 19.92 7.92H24V18H15.12Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function LandingTestimonials() {
  return (
    <section className="border-b bg-muted/20 px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          What Job Seekers Are Saying
        </h2>
        <p className="mt-3 text-center text-muted-foreground">
          Real feedback from people actively using TalentStreamAI in their job search.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map(({ quote, author }) => (
            <div
              key={author}
              className="flex flex-col justify-between rounded-2xl border bg-card p-6 shadow-sm"
            >
              <div>
                <QuoteIcon />
                <p className="mt-4 text-sm leading-relaxed text-foreground/80">
                  {quote}
                </p>
              </div>
              <p className="mt-6 text-sm font-semibold text-muted-foreground">
                — {author}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
