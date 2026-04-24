"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

function ScorePreview() {
  return (
    <div className="mx-auto mt-10 w-full max-w-sm rounded-2xl border bg-card p-5 shadow-md">
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Example optimization
      </p>
      <div className="flex items-center justify-center gap-4">
        {/* Before */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-3xl font-bold text-destructive">45%</span>
          <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[45%] rounded-full bg-destructive" />
          </div>
          <span className="text-xs text-muted-foreground">Before</span>
        </div>

        {/* Arrow */}
        <ArrowRight className="mt-[-10px] h-5 w-5 shrink-0 text-muted-foreground" />

        {/* After */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-3xl font-bold text-emerald-600">78%</span>
          <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[78%] rounded-full bg-emerald-500" />
          </div>
          <span className="text-xs text-muted-foreground">After</span>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        See exactly what&apos;s holding your resume back and fix it in seconds.
      </p>
    </div>
  );
}

export default function LandingHero() {
  const { isSignedIn } = useAuth();

  return (
    <section className="border-b bg-gradient-to-b from-muted/40 to-background px-6 pb-16 pt-20 text-center">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-[3.5rem]">
          Applying to jobs has never
          <br className="hidden sm:block" />
          <span className="text-primary"> been easier.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          Paste a job description. Instantly generate a tailored resume, cover
          letter, and match score — all in one place.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {isSignedIn ? (
            <>
              <Button asChild size="lg" className="px-8">
                <Link href="/apply">
                  Tailor a new application
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild size="lg" className="px-8">
                <Link href="/sign-up">
                  Get started free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#how-it-works">See how it works</Link>
              </Button>
            </>
          )}
        </div>
        {!isSignedIn && (
          <p className="mt-3 text-xs text-muted-foreground">
            No credit card required. Free to get started.
          </p>
        )}

        <ScorePreview />
      </div>
    </section>
  );
}
