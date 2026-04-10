import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";

export async function POST(req: Request) {
  const authResult = await requireUserId();
  if (authResult instanceof NextResponse) return authResult;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not set. Add it to your .env.local file and restart the server." },
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

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("OpenRouter API error:", response.status, errBody);
      return NextResponse.json(
        { error: `OpenRouter API returned ${response.status}. Try again in a moment.` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const raw = (data.choices?.[0]?.message?.content ?? "{}")
      .replace(/```json|```/g, "")
      .trim();

    try {
      const estimate = JSON.parse(raw);
      return NextResponse.json(estimate);
    } catch {
      console.error("Failed to parse OpenRouter response:", raw);
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