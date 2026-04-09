// src/app/api/meals/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const date = dateStr ? new Date(dateStr) : new Date();

    const meals = await prisma.mealLog.findMany({
      where: {
        date: {
          gte: startOfDay(date),
          lte: endOfDay(date),
        },
      },
      orderBy: { date: "asc" },
    });
    return NextResponse.json(meals);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const meal = await prisma.mealLog.create({
      data: {
        ...body,
        date: body.date ? new Date(body.date) : new Date(),
      },
    });
    return NextResponse.json(meal);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}