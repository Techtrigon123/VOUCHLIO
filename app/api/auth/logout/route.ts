import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth/jwt";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(clearAuthCookie());
  return response;
}

// Plain links (`<a href="/api/auth/logout">`) issue a GET — sign out and land on login
// (or on signup with ?next=/signup; nothing else is allowed, so this can't be used as an open redirect).
export async function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get("next") === "/signup" ? "/signup" : "/login";
  const response = NextResponse.redirect(new URL(next, req.url));
  response.cookies.set(clearAuthCookie());
  return response;
}
