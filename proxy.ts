import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { checkRateLimit, clientIp, findRules, retryMessage, type RateResult } from "@/lib/rate-limit";

const PROTECTED_PATHS = ["/dashboard", "/setup"];
const COOKIE = "checkin_token";

const MB = 1024 * 1024;
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Largest request body each API route needs (uploads are base64, ~1.37× the file). */
function maxBodyBytes(pathname: string): number {
  if (pathname === "/api/agent/extract") return 11 * MB; // 10 MB file upload
  if (pathname === "/api/agent/plan/submit") return 5 * MB; // 3 MB payment proof
  if (pathname === "/api/agent/profile") return 5 * MB; // logo + stamp images
  if (pathname.startsWith("/api/agent/documents")) return 1 * MB;
  if (pathname === "/api/agent/support/bugs") return 4 * MB; // 2.5 MB screenshot as base64
  return 256 * 1024;
}

function apiError(pathname: string, status: number, message: string, code: string) {
  // Auth pages read `error` as a string; the agent panel reads `error.message`.
  const error = pathname.startsWith("/api/auth/") ? message : { message, code };
  return NextResponse.json({ success: false, error }, { status });
}

/**
 * Reject cross-site writes. The SameSite=strict cookie already stops most CSRF;
 * this is a second layer that also covers requests carrying no cookie.
 */
function crossSite(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false; // same-origin fetches from older browsers, curl, server-to-server
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

/** Rate-limit every API request; see lib/rate-limit.ts for the rules. */
async function limitApi(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (WRITE_METHODS.has(request.method)) {
    if (crossSite(request)) return apiError(pathname, 403, "Cross-site request blocked.", "CROSS_SITE");
    // A streamed (chunked) body has no Content-Length, so the size cap below couldn't see it.
    // Browsers always send a length for fetch/form bodies, so only scripts are affected.
    const declared = request.headers.get("content-length");
    if (declared === null && request.headers.get("transfer-encoding"))
      return apiError(pathname, 411, "Request body must declare its size.", "LENGTH_REQUIRED");
    const length = Number(declared ?? 0);
    if (!Number.isFinite(length) || length > maxBodyBytes(pathname))
      return apiError(pathname, 413, "That request is too large. Try a smaller file.", "TOO_LARGE");
  }

  const rules = findRules(pathname, request.method);
  if (rules.length === 0) return NextResponse.next();

  const ipIdentity = `ip:${clientIp(request.headers)}`;
  let userIdentity: string | null = null;
  if (rules.some((r) => r.scope === "user")) {
    const token = request.cookies.get(COOKIE)?.value;
    const session = token ? verifyToken(token) : null;
    if (session?.userId) userIdentity = `user:${session.userId}`;
  }

  // Check the burst limit first, then each daily ceiling; the first one exceeded wins.
  let result: RateResult | null = null;
  for (const rule of rules) {
    const r = await checkRateLimit(rule, rule.scope === "user" ? userIdentity ?? ipIdentity : ipIdentity);
    if (!result) result = r; // headers describe the burst limit
    if (!r.allowed) {
      result = r;
      break;
    }
  }
  if (!result) return NextResponse.next();
  const headers = {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(result.resetIn),
  };

  if (!result.allowed) {
    const res = apiError(pathname, 429, retryMessage(result.resetIn), "RATE_LIMITED");
    for (const [k, v] of Object.entries({ ...headers, "Retry-After": String(result.resetIn) })) res.headers.set(k, v);
    return res;
  }

  const response = NextResponse.next();
  for (const [k, v] of Object.entries(headers)) response.headers.set(k, v);
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Force HTTPS once deployed. Hosts like Vercel already redirect, but behind other proxies the
  // original scheme only arrives in x-forwarded-proto. HSTS (next.config.ts) covers later visits.
  if (process.env.NODE_ENV === "production" && request.headers.get("x-forwarded-proto") === "http") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  if (pathname.startsWith("/api/")) return limitApi(request);

  const token = request.cookies.get(COOKIE)?.value;
  const session = token ? verifyToken(token) : null;

  // Redirect to login if accessing protected path without session
  const isProtected = PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isProtected && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  // Login and signup pages always render. If someone is already signed in, the page itself shows
  // "Continue to dashboard / use a different account" after checking the session against the database
  // (components/auth/SignedInNotice.tsx). Redirecting here on the cookie alone sent people straight past
  // the forms and could loop on a stale session.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
