"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

export default function LandingNavButtons() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return (
      <Button asChild size="sm">
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/sign-in"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Log in
      </Link>
      <Button asChild size="sm">
        <Link href="/sign-up">Get started free</Link>
      </Button>
    </div>
  );
}
