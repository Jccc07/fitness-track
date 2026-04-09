// src/app/api/profile/weight/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const logs = await prisma.weightLog.findMany({
      where: { profileId: "default" },
      orderBy: { date: "asc" },
      take: 30,
    });
    return NextResponse.json(logs);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}