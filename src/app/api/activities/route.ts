import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const date = dateStr ? new Date(dateStr) : new Date();

    const activities = await prisma.activityLog.findMany({
      where: {
        date: { gte: startOfDay(date), lte: endOfDay(date) },
      },
      orderBy: { date: "asc" },
    });
    return NextResponse.json(activities);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const activity = await prisma.activityLog.create({
      data: {
        ...body,
        date: body.date ? new Date(body.date) : new Date(),
      },
    });
    return NextResponse.json(activity);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}