// src/app/api/meals/analyze-image/route.ts
import { NextResponse } from "next/server";
import { FOOD_CALORIE_ESTIMATES } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { description } = body; // text extracted from image or user description

    const lower = (description || "").toLowerCase();
    const matched = Object.keys(FOOD_CALORIE_ESTIMATES).find((key) =>
      lower.includes(key)
    );
    const estimate = matched
      ? FOOD_CALORIE_ESTIMATES[matched]
      : FOOD_CALORIE_ESTIMATES.default;

    return NextResponse.json({
      detectedFood: matched || "unknown food",
      ...estimate,
      confidence: matched ? "medium" : "low",
      note: "AI estimate — please adjust if needed",
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}