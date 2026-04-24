import Link from "next/link";

const NAV = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Log In", href: "/sign-in" },
  { label: "Sign Up", href: "/sign-up" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Contact Us", href: "mailto:hello@talenstreamai.com" },
] as const;

export default function LandingFooter() {
  return (
    <footer className="bg-background px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            TalentStream<span className="text-primary">AI</span>
          </Link>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {NAV.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} TalentStreamAI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
