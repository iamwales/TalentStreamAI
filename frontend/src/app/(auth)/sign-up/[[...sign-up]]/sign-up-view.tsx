"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignUp, useAuth } from "@clerk/react";

export function SignUpView() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="text-center text-sm text-muted-foreground">Loading…</div>
    );
  }
  if (isSignedIn) {
    return null;
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Join TalentStreamAI to generate tailored resumes and cover letters in
          seconds.
        </p>
      </div>
      <SignUp
        path="/sign-up"
        routing="path"
        appearance={{ elements: { rootBox: "mx-auto" } }}
        signInUrl="/sign-in"
        forceRedirectUrl="/dashboard"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
