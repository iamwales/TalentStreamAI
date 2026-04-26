import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server";

const clerkEnabled =
  !!process.env.CLERK_SECRET_KEY &&
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default async function middleware(
  req: NextRequest,
  event: NextFetchEvent,
) {
  if (!clerkEnabled) return NextResponse.next();

  const { clerkMiddleware, createRouteMatcher } = await import(
    "@clerk/nextjs/server"
  );

  const isProtectedRoute = createRouteMatcher([
    "/dashboard(.*)",
    "/apply(.*)",
    "/applications(.*)",
    "/resume(.*)",
    "/onboarding(.*)",
  ]);

  const isPublicAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

  return clerkMiddleware(async (auth, request) => {
    if (isProtectedRoute(request)) {
      await auth.protect();
    }

    if (isPublicAuthRoute(request)) {
      const { userId } = await auth();
      if (userId) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    return NextResponse.next();
  })(req, event);
}

export const config = {
  matcher: ["/((?!_next|api|trpc|static|_vercel|.*\\..*).*)"],
};
