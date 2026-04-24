"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/react";

import { Button, type ButtonProps } from "@/components/ui/button";

type LandingCtaButtonProps = Omit<ButtonProps, "asChild"> & {
  children: ReactNode;
};

/**
 * Primary landing CTAs: /dashboard for signed-in users, /sign-up for guests
 * (matches middleware redirect for authenticated visits to /sign-in and /sign-up).
 */
export function LandingCtaButton({ children, disabled, ...buttonProps }: LandingCtaButtonProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const href = isSignedIn ? "/dashboard" : "/sign-up";

  if (!isLoaded) {
    return (
      <Button {...buttonProps} disabled>
        {children}
      </Button>
    );
  }

  if (disabled) {
    return (
      <Button {...buttonProps} disabled>
        {children}
      </Button>
    );
  }

  return (
    <Button asChild {...buttonProps}>
      <Link href={href}>{children}</Link>
    </Button>
  );
}
