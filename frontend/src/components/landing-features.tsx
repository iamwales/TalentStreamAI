import { FileText, Gauge, MessageSquareQuote } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    icon: FileText,
    title: "AI resume tailoring",
    body: "Upload your base resume once. We rewrite bullets, reorder experience, and surface the most relevant skills for every role.",
  },
  {
    icon: MessageSquareQuote,
    title: "Personalized cover letters",
    body: "Generate compelling, role-specific cover letters in seconds — no more blank-page paralysis.",
  },
  {
    icon: Gauge,
    title: "Match score & gap analysis",
    body: "See instantly how well you fit a role and exactly which skills to emphasize or learn next.",
  },
] as const;

export default function LandingFeatures() {
  return (
    <section className="border-b bg-background py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How TalentStreamAI works
          </h2>
          <p className="mt-3 text-muted-foreground">
            Three steps to a stronger application, every time.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <CardContent className="space-y-3 p-6">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
