import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";

export async function POST(req: Request) {
  const authResult = await requireUserId();
  if (authResult instanceof NextResponse) return authResult;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not set. Add it to your .env.local file and restart the server." },
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 300 },
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Gemini API error:", response.status, errBody);
      return NextResponse.json(
        { error: `Gemini API returned ${response.status}. Try again in a moment.` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}")
      .replace(/```json|```/g, "")
      .trim();

    try {
      const estimate = JSON.parse(raw);
      return NextResponse.json(estimate);
    } catch {
      console.error("Failed to parse Gemini response:", raw);
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