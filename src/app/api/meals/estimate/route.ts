// src/app/api/meals/estimate/route.ts
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";

export async function POST(req: Request) {
  const authResult = await requireUserId();
  if (authResult instanceof NextResponse) return authResult;

  // Check API key up front — gives a clear error instead of a cryptic 401
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to your .env.local file and restart the server." },
      { status: 500 }
    );
  }

  try {
    const { foodName, ingredients, portion } = await req.json();
    if (!foodName) return NextResponse.json({ error: "Food name required" }, { status: 400 });

    const prompt = `You are a nutrition expert with deep knowledge of Filipino cuisine and Asian foods.

Estimate the nutritional content for: "${foodName}"
${ingredients ? `Ingredients/description: ${ingredients}` : ""}
${portion ? `Portion/serving size: ${portion}` : "Assume a standard single serving"}

This could be a Filipino dish (adobo, sinigang, kare-kare, lechon, tinola, nilaga, pinakbet,
bistek, menudo, caldereta, mechado, afritada, bangus, tilapia, tocino, longganisa,
tapa, champorado, lugaw, goto, bulalo, palabok, pancit, rice dishes, etc.)
or fast food (Jollibee, McDonald's PH, Chowking, Mang Inasal, KFC PH, Greenwich, etc.)
or any international food.

Respond ONLY with a valid JSON object — no markdown, no explanation:
{
  "name": "Standardized English name",
  "portion": "portion description",
  "calories": 350,
  "protein": 25,
  "carbs": 30,
  "fat": 12
}

Protein, carbs, fat are in grams. Use realistic Filipino home-cooked or fast food serving sizes.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Anthropic API error:", response.status, errBody);
      if (response.status === 401) {
        return NextResponse.json(
          { error: "Invalid API key. Check your ANTHROPIC_API_KEY in .env.local." },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: errBody },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (data.error) {
      console.error("Anthropic error body:", data.error);
      return NextResponse.json(
        { error: data.error.message ?? "AI estimation failed." },
        { status: 502 }
      );
    }

    const raw = (data.content?.[0]?.text ?? "{}").replace(/```json|```/g, "").trim();

    try {
      const estimate = JSON.parse(raw);
      return NextResponse.json(estimate);
    } catch {
      console.error("Failed to parse Claude response:", raw);
      return NextResponse.json(
        { error: "Could not parse AI response. Try adding more detail to the food name." },
        { status: 500 }
      );
    }
  } catch (e) {
    console.error("Food estimate error:", e);
    return NextResponse.json(
      { error: "Could not estimate nutrition. Check your connection and try again." },
      { status: 500 }
    );
  }
}