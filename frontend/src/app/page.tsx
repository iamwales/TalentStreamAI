import Link from "next/link";

import LandingCta from "@/components/landing-cta";
import LandingFeatures from "@/components/landing-features";
import LandingFooter from "@/components/landing-footer";
import LandingHero from "@/components/landing-hero";
import LandingNavButtons from "@/components/landing-nav-buttons";
import LandingProblemSolution from "@/components/landing-problem-solution";
import LandingStats from "@/components/landing-stats";
import LandingTestimonials from "@/components/landing-testimonials";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/" className="text-base font-bold tracking-tight">
            TalentStream<span className="text-primary">AI</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <Link
              href="#how-it-works"
              className="transition-colors hover:text-foreground"
            >
              How It Works
            </Link>
          </nav>
          <LandingNavButtons />
        </div>
      </header>

      <main className="flex-1">
        <LandingHero />
        <LandingStats />
        <LandingFeatures />
        <LandingProblemSolution />
        <LandingTestimonials />
        <LandingCta />
      </main>

      <LandingFooter />
    </div>
  );
}
