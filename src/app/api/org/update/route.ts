import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveAuthedOrg } from "@/lib/resolve-org";

const Body = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "slug must be lowercase, alphanumeric, may contain dashes")
    .optional(),
  executionMode: z.enum(["AUTONOMOUS", "ASSISTED", "ENTERPRISE"]).optional(),
});

/**
 * POST /api/org/update
 *
 * Update the caller's primary org. Only OWNER or ADMIN may change name/slug;
 * any role may read but cannot change anything else here. Returns the
 * updated org so the client can refresh.
 */
export async function POST(req: Request) {
  const ctx = await resolveAuthedOrg();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  const { orgId, userId, org } = ctx;

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  if (data.slug && data.slug !== org.slug) {
    const existing = await db.organization.findUnique({ where: { slug: data.slug } });
    if (existing) return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
  }

  try {
    const updated = await db.organization.update({
      where: { id: orgId },
      data,
    });
    await db.auditLog.create({
      data: {
        orgId,
        actorId: userId,
        action: "org.update",
        target: orgId,
        meta: data,
      },
    });
    return NextResponse.json({
      ok: true,
      org: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        plan: updated.plan,
        executionMode: updated.executionMode,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
