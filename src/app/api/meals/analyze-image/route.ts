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

interface AnalysisResult {
  items: FoodItem[];
  note: string;
}

export async function POST(req: Request) {
  const authResult = await requireUserId();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await req.json();
    const { imageBase64, mimeType, description } = body;

    if (!imageBase64 && !description) {
      return NextResponse.json(
        { error: "Provide an image or a text description." },
        { status: 400 }
      );
    }

    const prompt = `You are a nutrition expert with deep knowledge of Filipino cuisine and international foods.

Analyze ${imageBase64 ? "this food image" : "this food description"} and identify ALL food items present.
${description ? `Additional context from user: "${description}"` : ""}

For each food item identified, provide a detailed nutrition estimate.
Be especially accurate with Filipino dishes like adobo, sinigang, kare-kare, lechon, pancit, rice, etc.
Also recognize Philippine fast food: Jollibee, Chowking, Mang Inasal, Greenwich, McDonald's PH.

Respond ONLY with a valid JSON object in this exact format (no markdown, no explanation):
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
  "note": "Brief note about confidence level or any assumptions made"
}

Important rules:
- Identify EVERY visible food item separately (rice, viand, drink, side dishes, etc.)
- Use realistic Filipino/Asian portion sizes
- If multiple servings are visible, estimate accordingly
- For combo meals (e.g. Jollibee meal), list each component separately
- Protein, carbs, fat values are in grams`;

    // Build message content array
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

    // claude-sonnet-4-6 supports vision and is the correct current model string
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: messageContent }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Claude Vision API error:", response.status, errText);
      return NextResponse.json(
        { error: `AI service error (${response.status}). Check your API key and try again.` },
        { status: 502 }
      );
    }

    const claudeData = await response.json();

    if (claudeData.error) {
      console.error("Claude error body:", claudeData.error);
      return NextResponse.json(
        { error: claudeData.error.message ?? "AI image analysis failed." },
        { status: 502 }
      );
    }

    const rawText = claudeData.content?.[0]?.text ?? "{}";
    const cleaned = rawText.replace(/```json|```/g, "").trim();

    let parsed: AnalysisResult;
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
    const totalCalories = items.reduce((s, i) => s + (i.calories ?? 0), 0);
    const totalProtein  = items.reduce((s, i) => s + (i.protein  ?? 0), 0);
    const totalCarbs    = items.reduce((s, i) => s + (i.carbs    ?? 0), 0);
    const totalFat      = items.reduce((s, i) => s + (i.fat      ?? 0), 0);

    return NextResponse.json({
      items,
      totalCalories,
      totalProtein:  Math.round(totalProtein),
      totalCarbs:    Math.round(totalCarbs),
      totalFat:      Math.round(totalFat),
      note: parsed.note ?? "AI estimate — please adjust if needed",
    });
  } catch (e) {
    console.error("Image analysis error:", e);
    return NextResponse.json(
      { error: "Failed to analyze image. Please try again or describe the food manually." },
      { status: 500 }
    );
  }
}