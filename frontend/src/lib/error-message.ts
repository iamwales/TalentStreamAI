import { ApiError } from "@/lib/api";

/** User-facing text for caught API / network / unknown errors. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message || `Request failed (${error.status})`;
  }
  if (error instanceof Error) {
    return error.message || "Something went wrong";
  }
  if (typeof error === "string") {
    return error;
  }
  return "Something went wrong. Please try again.";
}
