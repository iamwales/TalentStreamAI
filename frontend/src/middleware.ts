import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/apply(.*)",
  "/applications(.*)",
  "/resume(.*)",
  "/onboarding(.*)",
]);

const isPublicAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    // auth.protect() redirects to sign-in if unauthenticated
    await auth.protect();
  }

  if (isPublicAuthRoute(req)) {
    const { userId } = await auth();
    if (userId) {
      // Already logged in — send to dashboard
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|api|trpc|static|_vercel|.*\\..*).*)"],
};
