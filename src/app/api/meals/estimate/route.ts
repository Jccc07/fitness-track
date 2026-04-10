// src/app/api/meals/estimate/route.ts
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";

interface FoodEstimate {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export async function POST(req: Request) {
  const authResult = await requireUserId();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { foodName, ingredients, portion } = await req.json();
    if (!foodName) return NextResponse.json({ error: "Food name required" }, { status: 400 });

    const prompt = `You are a nutrition expert with deep knowledge of Filipino cuisine and Asian foods.

Estimate the nutritional content for: "${foodName}"
${ingredients ? `Ingredients/description: ${ingredients}` : ""}
${portion ? `Portion/serving size: ${portion}` : "Assume a standard single serving"}

This could be a Filipino dish (e.g. adobo, sinigang, kare-kare, lechon, tinola, nilaga, pinakbet, 
bistek, menudo, caldereta, mechado, afritada, pork chop, bangus, tilapia, tocino, longganisa, 
tapa, champorado, lugaw, goto, bulalo, mami, palabok, pancit, rice dishes, etc.)
or fast food (Jollibee, McDonald's PH, Chowking, Mang Inasal, KFC PH, Greenwich, etc.)
or any international food.

Respond ONLY with a valid JSON object (no markdown, no explanation):
{
  "name": "Standardized English name",
  "portion": "portion description",
  "calories": 350,
  "protein": 25,
  "carbs": 30,
  "fat": 12,
  "confidence": "high|medium|low",
  "note": "brief note if any"
}

Protein, carbs, fat are in grams. Be realistic — typical Filipino home-cooked or fast food serving sizes.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Claude API error:", response.status, errText);
      return NextResponse.json(
        { error: `AI service error (${response.status}). Check your API key and try again.` },
        { status: 502 }
      );
    }

    const data = await response.json();

    // Check for API-level errors returned in the body
    if (data.error) {
      console.error("Claude error body:", data.error);
      return NextResponse.json(
        { error: data.error.message ?? "AI estimation failed." },
        { status: 502 }
      );
    }

    const raw = (data.content?.[0]?.text ?? "{}").replace(/```json|```/g, "").trim();

    let estimate: FoodEstimate & { confidence?: string; note?: string };
    try {
      estimate = JSON.parse(raw);
    } catch {
      console.error("Failed to parse Claude response:", raw);
      return NextResponse.json(
        { error: "Could not parse nutrition estimate. Try adding more detail." },
        { status: 500 }
      );
    }

    return NextResponse.json(estimate);
  } catch (e) {
    console.error("Food estimate error:", e);
    return NextResponse.json(
      { error: "Could not estimate nutrition. Try adding more detail." },
      { status: 500 }
    );
  }
}