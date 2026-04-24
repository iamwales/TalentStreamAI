const STATS = [
  { value: "2,400+", label: "Active users" },
  { value: "8,900+", label: "Tailored resumes" },
  { value: "11,200+", label: "Applications tracked" },
] as const;

export default function LandingStats() {
  return (
    <section className="border-b bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="grid grid-cols-3 divide-x text-center">
          {STATS.map(({ value, label }) => (
            <div key={label} className="px-4 py-2">
              <p className="text-3xl font-bold tracking-tight">{value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Based on self-reported application tracking and user activity stored in the TalentStreamAI database.
        </p>
      </div>
    </section>
  );
}
