import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "taskflow_session";

// Update PROTECTED_PREFIXES in middleware.ts:
const PROTECTED_PREFIXES = [
  "/today",
  "/tasks",
  "/inbox",
  "/settings",
  "/admin",
  "/dashboard",
  "/my-day",
  "/team",
  "/reports",
  "/planner",
  "/schedule",
  "/boards",
  "/habits",
  "/team-pool",
  "/upcoming",
  "/brain-dump",
  "/calendar",
  "/projects",
  "/notifications",
  "/automations",
];

const AUTH_PAGES = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  const isAuthPage = AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );

  const isProtectedPath = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // Authenticated user trying to visit login/register -> send to /today
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/today", request.url));
  }

  // Unauthenticated user trying to visit protected routes -> send to /login
  if (!token && isProtectedPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|sw.js|manifest.json|.*\\..*$).*)",
  ],
};