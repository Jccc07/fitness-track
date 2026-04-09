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
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  note: string;
}

export async function POST(req: Request) {
  const authResult = await requireUserId();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await req.json();
    const { imageBase64, mimeType, description } = body;

    // Build the prompt for Claude
    const prompt = `You are a nutrition expert with deep knowledge of Filipino cuisine and international foods.

Analyze ${imageBase64 ? "this food image" : "this food description"} and identify ALL food items present.
${description ? `Additional context from user: "${description}"` : ""}

For each food item identified, provide a detailed nutrition estimate.
Be especially accurate with Filipino dishes like adobo, sinigang, kare-kare, lechon, pancit, rice, etc.

Respond ONLY with a valid JSON object in this exact format (no markdown, no explanation):
{
  "items": [
    {
      "name": "Food item name (use common name, e.g. 'Chicken Adobo' not 'adobong manok')",
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

    const messageContent: Array<{type: string; text?: string; source?: {type: string; media_type: string; data: string}}> = [];

    if (imageBase64) {
      messageContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType || "image/jpeg",
          data: imageBase64,
        },
      });
    }
    messageContent.push({ type: "text", text: prompt });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: messageContent }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const claudeData = await response.json();
    const rawText = claudeData.content?.[0]?.text || "{}";

    // Strip any accidental markdown fences
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed: AnalysisResult = JSON.parse(cleaned);

    // Compute totals
    const totalCalories = parsed.items.reduce((s: number, i: FoodItem) => s + (i.calories || 0), 0);
    const totalProtein  = parsed.items.reduce((s: number, i: FoodItem) => s + (i.protein  || 0), 0);
    const totalCarbs    = parsed.items.reduce((s: number, i: FoodItem) => s + (i.carbs    || 0), 0);
    const totalFat      = parsed.items.reduce((s: number, i: FoodItem) => s + (i.fat      || 0), 0);

    return NextResponse.json({
      items: parsed.items,
      totalCalories,
      totalProtein: Math.round(totalProtein),
      totalCarbs:   Math.round(totalCarbs),
      totalFat:     Math.round(totalFat),
      note: parsed.note || "AI estimate — please adjust if needed",
    });
  } catch (e) {
    console.error("Image analysis error:", e);
    return NextResponse.json(
      { error: "Failed to analyze image. Please try again or describe the food manually." },
      { status: 500 }
    );
  }
}