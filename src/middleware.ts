import { NextResponse, type NextRequest } from "next/server";

/**
 * Minimal middleware. Real tenant resolution + RLS setup happens in route
 * handlers / server components via `resolveTenant` + `withRls` (src/lib/tenant.ts),
 * since middleware runs on the Edge and cannot use Prisma.
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("X-EIAAW-Version", "0.1.0");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health).*)"],
};
