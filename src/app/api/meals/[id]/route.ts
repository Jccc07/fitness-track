// src/app/api/meals/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const result = await requireUserId();
  if (result instanceof NextResponse) return result;
  const userId = result;

  try {
    const body = await req.json();
    const meal = await prisma.mealLog.updateMany({
      where: { id: params.id, userId },
      data: body,
    });
    return NextResponse.json(meal);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const result = await requireUserId();
  if (result instanceof NextResponse) return result;
  const userId = result;

  try {
    await prisma.mealLog.deleteMany({ where: { id: params.id, userId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}