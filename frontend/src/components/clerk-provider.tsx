"use client";

import { ClerkProvider } from "@clerk/react";

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/**
 * Client-only Clerk provider so `output: "export"` does not pull in App Router
 * server actions from `@clerk/nextjs` (see Next.js static export limitations).
 */
export function ClerkProviderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!publishableKey) {
    throw new Error("Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      afterSignOutUrl="/"
      signInForceRedirectUrl="/dashboard"
      signUpForceRedirectUrl="/dashboard"
    >
      {children}
    </ClerkProvider>
  );
}
