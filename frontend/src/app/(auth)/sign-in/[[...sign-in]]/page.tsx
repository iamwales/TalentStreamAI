import { SignIn } from "@clerk/nextjs";

export function generateStaticParams() {
  return [];
}

export default function SignInPage() {
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to access your dashboard and tailor new applications.
        </p>
      </div>
      <SignIn
        appearance={{ elements: { rootBox: "mx-auto" } }}
        signUpUrl="/sign-up"
        forceRedirectUrl="/dashboard"
      />
    </div>
  );
}
