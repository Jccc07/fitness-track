// src/app/api/meals/analyze-image/route.ts
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

  // Check API key up front — gives a clear error instead of a cryptic 401
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to your .env.local file and restart the server." },
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

    type ContentBlock =
      | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
      | { type: "text"; text: string };

    const messageContent: ContentBlock[] = [];

    if (imageBase64) {
      messageContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType ?? "image/jpeg",
          data: imageBase64,
        },
      });
    }
    messageContent.push({ type: "text", text: prompt });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",  // Sonnet 4.6 — supports vision, fast and accurate
        max_tokens: 1024,
        messages: [{ role: "user", content: messageContent }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Anthropic Vision API error:", response.status, errBody);
      if (response.status === 401) {
        return NextResponse.json(
          { error: "Invalid API key. Check your ANTHROPIC_API_KEY in .env.local." },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: `Anthropic API returned ${response.status}. Try again in a moment.` },
        { status: 502 }
      );
    }

    const claudeData = await response.json();

    if (claudeData.error) {
      console.error("Anthropic error body:", claudeData.error);
      return NextResponse.json(
        { error: claudeData.error.message ?? "AI image analysis failed." },
        { status: 502 }
      );
    }

    const rawText = claudeData.content?.[0]?.text ?? "{}";
    const cleaned = rawText.replace(/```json|```/g, "").trim();

    let parsed: { items: FoodItem[]; note?: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Claude vision response:", cleaned);
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