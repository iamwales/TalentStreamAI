import { ClipboardList, FileUp, Zap } from "lucide-react";

const STEPS = [
  {
    step: "Step 1",
    icon: ClipboardList,
    title: "Paste Job Description",
    body: "Copy the job posting and paste it in. We extract what matters — required skills, keywords, and role expectations.",
  },
  {
    step: "Step 2",
    icon: FileUp,
    title: "Upload Your Resume",
    body: "Upload your existing resume in PDF, DOCX, or TXT. We use it as the foundation for everything we generate.",
  },
  {
    step: "Step 3",
    icon: Zap,
    title: "Get Your Optimized Application",
    body: "Receive a tailored resume, cover letter, draft email, and a match score with gap analysis — instantly.",
  },
] as const;

/* Inline app mockup — no screenshot needed */
function AppMockup() {
  return (
    <div className="mx-auto mt-16 max-w-5xl overflow-hidden rounded-2xl border bg-card shadow-lg">
      {/* fake browser chrome */}
      <div className="flex items-center gap-1.5 border-b bg-muted/60 px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-amber-400" />
        <span className="h-3 w-3 rounded-full bg-emerald-400" />
        <div className="mx-auto flex h-6 w-60 items-center justify-center rounded bg-background text-xs text-muted-foreground">
          talenstreamai.com/apply
        </div>
      </div>

      <div className="grid md:grid-cols-2">
        {/* Left pane — input */}
        <div className="space-y-4 border-r p-6">
          <p className="text-sm font-semibold">Upload Resume</p>
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/30 p-8 text-center">
            <FileUp className="h-6 w-6 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Drag and drop your resume here</p>
            <div className="mt-1 rounded-md bg-background px-3 py-1 text-xs font-medium shadow-sm border">
              Choose File
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium">Your Resumes</p>
            <div className="mt-2 flex items-center justify-between rounded-md bg-background px-3 py-2 text-xs shadow-sm">
              <span className="font-medium"># John Smith.docx</span>
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                Selected
              </span>
            </div>
          </div>
        </div>

        {/* Right pane — output preview */}
        <div className="space-y-3 p-6">
          <p className="text-sm font-semibold">Job Match Analysis</p>
          <div className="grid grid-cols-3 gap-2 rounded-lg border p-3 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Original</p>
              <p className="text-xl font-bold text-destructive">45%</p>
              <div className="mx-auto mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[45%] rounded-full bg-destructive" />
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Tailored</p>
              <p className="text-xl font-bold text-emerald-600">75%</p>
              <div className="mx-auto mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[75%] rounded-full bg-emerald-500" />
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Improvement</p>
              <p className="text-xl font-bold text-emerald-600">+30%</p>
              <p className="text-[10px] text-muted-foreground">After one extra tailoring pass</p>
            </div>
          </div>
          <div className="space-y-1.5 rounded-lg border p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">What We Improved</p>
            {[
              "Repositioned security architecture work higher in the resume.",
              "Strengthened Azure & O365 remediation language.",
              "Improved keyword coverage around vulnerability management.",
            ].map((t) => (
              <p key={t} className="flex gap-1.5 text-xs text-muted-foreground">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                {t}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingFeatures() {
  return (
    <section id="how-it-works" className="border-b bg-muted/20 px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How It Works</h2>
          <p className="mt-3 text-muted-foreground">
            Three steps. Under a minute. Better results on every application.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {STEPS.map(({ step, icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {step}
              </p>
              <h3 className="mt-1 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>

        <AppMockup />
      </div>
    </section>
  );
}
