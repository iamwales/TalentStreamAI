"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function LandingHero() {
  const { isSignedIn } = useAuth();

  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-background to-muted/40">
      <div className="mx-auto flex max-w-5xl flex-col items-center px-6 py-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI-powered career co-pilot
        </div>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Land more interviews with tailored applications in seconds.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Paste any job posting and instantly generate a tailored resume, cover
          letter, and match score. Stop rewriting bullets. Start getting
          callbacks.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {isSignedIn ? (
            <>
              <Button asChild size="lg">
                <Link href="/dashboard">
                  Go to dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/apply">Tailor a new application</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild size="lg">
                <Link href="/sign-up">
                  Get started free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
