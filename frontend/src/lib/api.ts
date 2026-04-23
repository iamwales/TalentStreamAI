export function getApiBaseUrl(): string {
  // In production behind CloudFront, prefer same-origin `/api/*` by leaving this empty at build time.
  return process.env.NEXT_PUBLIC_API_URL || "";
}

export function buildApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!base) {
    return normalized;
  }
  return `${base.replace(/\/$/, "")}${normalized}`;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type FetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string | null;
};

/**
 * Typed fetch helper. Attaches the Clerk bearer token when provided, sends
 * JSON, and throws `ApiError` on non-2xx responses.
 *
 * Server components: pass a token from `auth().getToken()`.
 * Client components: pull from `useAuth().getToken()` (see hooks/use-api-client.ts).
 */
export async function apiFetch<T>(
  path: string,
  { body, token, headers, ...init }: FetchOptions = {},
): Promise<T> {
  const isFormData = body instanceof FormData;

  const finalHeaders = new Headers(headers);
  if (!isFormData && body !== undefined) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (token) {
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: finalHeaders,
    body: isFormData
      ? (body as FormData)
      : body !== undefined
        ? JSON.stringify(body)
        : undefined,
  });

  const text = await response.text();
  const parsed = text ? safeJsonParse(text) : undefined;

  if (!response.ok) {
    const message =
      (parsed &&
        typeof parsed === "object" &&
        parsed !== null &&
        "detail" in parsed &&
        typeof (parsed as { detail: unknown }).detail === "string" &&
        (parsed as { detail: string }).detail) ||
      response.statusText ||
      "Request failed";
    throw new ApiError(message, response.status, parsed);
  }

  return parsed as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
