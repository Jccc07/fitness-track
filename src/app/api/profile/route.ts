// src/app/api/profile/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeHealthMetrics } from "@/lib/calculations";

export async function GET() {
  try {
    const profile = await prisma.userProfile.findUnique({ where: { id: "default" } });
    if (!profile) return NextResponse.json(null);
    const metrics = computeHealthMetrics(profile as Parameters<typeof computeHealthMetrics>[0]);
    return NextResponse.json({ profile, metrics });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const profile = await prisma.userProfile.upsert({
      where: { id: "default" },
      update: body,
      create: { id: "default", ...body },
    });
    // Log weight if changed
    await prisma.weightLog.create({
      data: { weight: profile.weight, profileId: "default" },
    });
    const metrics = computeHealthMetrics(profile as Parameters<typeof computeHealthMetrics>[0]);
    return NextResponse.json({ profile, metrics });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}