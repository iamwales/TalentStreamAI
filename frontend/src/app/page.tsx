import Link from "next/link";

import LandingCta from "@/components/landing-cta";
import LandingFeatures from "@/components/landing-features";
import LandingHero from "@/components/landing-hero";
import LandingNavButtons from "@/components/landing-nav-buttons";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            TalentStream<span className="text-primary">AI</span>
          </Link>
          <LandingNavButtons />
        </div>
      </header>

      <main className="flex-1">
        <LandingHero />
        <LandingFeatures />
        <LandingCta />
      </main>

      <footer className="border-t bg-background py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} TalentStreamAI
        </div>
      </footer>
    </div>
  );
}
