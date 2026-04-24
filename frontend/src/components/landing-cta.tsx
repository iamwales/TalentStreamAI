"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function LandingCta() {
  const { isSignedIn } = useAuth();

  return (
    <section className="border-b bg-background px-6 py-24 text-center">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Stop Sending Generic Applications
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Start applying with resumes tailored to every job.
        </p>
        <div className="mt-8">
          <Button asChild size="lg" className="px-10">
            {isSignedIn ? (
              <Link href="/apply">
                Tailor a new application
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            ) : (
              <Link href="/sign-up">
                Get started free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            )}
          </Button>
        </div>
        {!isSignedIn && (
          <p className="mt-3 text-xs text-muted-foreground">
            No credit card required.
          </p>
        )}
      </div>
    </section>
  );
}
