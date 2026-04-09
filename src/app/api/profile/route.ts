// src/app/api/profile/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeHealthMetrics } from "@/lib/calculations";
import { requireUserId } from "@/lib/session";

export async function GET() {
  const result = await requireUserId();
  if (result instanceof NextResponse) return result;
  const userId = result;

  try {
    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json(null);
    const metrics = computeHealthMetrics(profile as Parameters<typeof computeHealthMetrics>[0]);
    return NextResponse.json({ profile, metrics });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const result = await requireUserId();
  if (result instanceof NextResponse) return result;
  const userId = result;

  try {
    const body = await req.json();
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: body,
      create: { userId, ...body },
    });
    await prisma.weightLog.create({ data: { weight: profile.weight, userId } });
    const metrics = computeHealthMetrics(profile as Parameters<typeof computeHealthMetrics>[0]);
    return NextResponse.json({ profile, metrics });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}