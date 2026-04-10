import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";

interface FoodItem {
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not set. Add it to your .env.local file and restart the server." },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { imageBase64, mimeType, description } = body;

    if (!imageBase64 && !description) {
      return NextResponse.json(
        { error: "Provide an image or a text description of the meal." },
        { status: 400 }
      );
    }

    const prompt = `You are a nutrition expert with deep knowledge of Filipino cuisine and international foods.

Analyze ${imageBase64 ? "this food image" : "this food description"} and identify ALL food items present.
${description ? `Additional context from user: "${description}"` : ""}

Be especially accurate with Filipino dishes: adobo, sinigang, kare-kare, lechon, pancit, rice, etc.
Also recognize Philippine fast food: Jollibee, Chowking, Mang Inasal, Greenwich, McDonald's PH, KFC PH.

Respond ONLY with a valid JSON object — no markdown, no explanation:
{
  "items": [
    {
      "name": "Food item name",
      "portion": "estimated portion (e.g. '1 cup', '1 piece', '200g')",
      "calories": 250,
      "protein": 20,
      "carbs": 15,
      "fat": 10
    }
  ],
  "note": "brief note about confidence or assumptions"
}

Rules:
- List EVERY visible food item separately (rice, viand, drink, side dishes, etc.)
- Use realistic Filipino/Asian portion sizes
- For combo meals (e.g. Jollibee meal), list each component separately
- Protein, carbs, fat are in grams`;

    type Part =
      | { text: string }
      | { inlineData: { mimeType: string; data: string } };

    const parts: Part[] = [];

    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: mimeType ?? "image/jpeg",
          data: imageBase64,
        },
      });
    }
    parts.push({ text: prompt });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { maxOutputTokens: 1024 },
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Gemini Vision API error:", response.status, errBody);
      return NextResponse.json(
        { error: `Gemini API returned ${response.status}. Try again in a moment.` },
        { status: 502 }
      );
    }

    const geminiData = await response.json();
    const rawText = (geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}")
      .replace(/```json|```/g, "")
      .trim();

    let parsed: { items: FoodItem[]; note?: string };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error("Failed to parse Gemini vision response:", rawText);
      return NextResponse.json(
        { error: "Could not parse AI response. Please try again." },
        { status: 500 }
      );
    }

    const items: FoodItem[] = parsed.items ?? [];

    return NextResponse.json({
      items,
      totalCalories: items.reduce((s, i) => s + (i.calories ?? 0), 0),
      totalProtein:  Math.round(items.reduce((s, i) => s + (i.protein  ?? 0), 0)),
      totalCarbs:    Math.round(items.reduce((s, i) => s + (i.carbs    ?? 0), 0)),
      totalFat:      Math.round(items.reduce((s, i) => s + (i.fat      ?? 0), 0)),
      note: parsed.note ?? "AI estimate — please adjust if needed",
    });
  } catch (e) {
    console.error("Image analysis error:", e);
    return NextResponse.json(
      { error: "Failed to analyze. Please try again or describe the food manually." },
      { status: 500 }
    );
  }
}