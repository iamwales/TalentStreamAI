"use client";

import { useEffect } from "react";

const STATIC_HTML_ROUTES = new Set([
  "/dashboard",
  "/apply",
  "/applications",
  "/resume",
  "/onboarding",
  "/sign-in",
  "/sign-up",
]);

export function RouteFallbackRedirect() {
  useEffect(() => {
    const current = window.location.pathname.replace(/\/+$/, "") || "/";
    if (current === "/" || current.endsWith(".html")) {
      return;
    }

    // Dynamic application detail routes cannot be directly refreshed on static hosting.
    const appDetailMatch = current.match(/^\/applications\/([^/]+)$/);
    if (appDetailMatch?.[1]) {
      const id = encodeURIComponent(appDetailMatch[1]);
      const hash = window.location.hash || "";
      window.location.replace(`/applications.html?applicationId=${id}${hash}`);
      return;
    }

    if (STATIC_HTML_ROUTES.has(current)) {
      const query = window.location.search || "";
      const hash = window.location.hash || "";
      window.location.replace(`${current}.html${query}${hash}`);
    }
  }, []);

  return null;
}
