"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

export default function LandingCta() {
  const { isSignedIn } = useAuth();

  return (
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to stop rewriting resumes?
        </h2>
        <p className="mt-4 text-primary-foreground/80">
          Join thousands of job seekers landing more interviews with tailored AI applications.
        </p>
        <div className="mt-8">
          <Button asChild size="lg" variant="secondary">
            {isSignedIn ? (
              <Link href="/apply">Tailor a new application</Link>
            ) : (
              <Link href="/sign-up">Get started free</Link>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
