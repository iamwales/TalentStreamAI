// Lightweight liveness probe used by the ALB target group.
// Bypasses Clerk middleware via the existing matcher (see `src/middleware.ts`,
// which excludes `/api/*`). Keep this route trivial: no DB, no auth, no I/O.
//
// Note: CloudFront routes external `/api/*` traffic to API Gateway/Lambda, so
// this endpoint is only hit by the ALB health checker (which talks to the
// task IPs directly) and by anything inside the VPC.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return Response.json(
    { status: "ok", service: "frontend" },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
