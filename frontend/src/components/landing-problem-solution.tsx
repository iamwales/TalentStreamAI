import { Check, X } from "lucide-react";

const PROBLEMS = [
  "Your resume isn't tailored to the job",
  "Missing keywords filter you out before a human sees it",
  "Formatting breaks when scanned by tracking systems",
  "You're sending the same generic application every time",
] as const;

const SOLUTIONS = [
  "Get your ATS match score instantly",
  "See exactly which keywords you're missing",
  "Generate a tailored resume for each job",
  "Create a targeted cover letter automatically",
  "Draft a personalised outreach email in one click",
  "Track all your applications in one place",
] as const;

export default function LandingProblemSolution() {
  return (
    <section className="border-b bg-background px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-10 md:grid-cols-2">
          {/* Problem */}
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8">
            <h2 className="text-2xl font-bold tracking-tight">
              Why You&apos;re Not Getting Interviews
            </h2>
            <ul className="mt-6 space-y-3">
              {PROBLEMS.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm text-foreground/80">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  {p}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm italic text-muted-foreground">
              That&apos;s why you can apply to dozens of jobs and hear nothing back.
            </p>
          </div>

          {/* Solution */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <h2 className="text-2xl font-bold tracking-tight">
              Fix That in Seconds
            </h2>
            <ul className="mt-6 space-y-3">
              {SOLUTIONS.map((s) => (
                <li key={s} className="flex items-start gap-3 text-sm text-foreground/80">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
