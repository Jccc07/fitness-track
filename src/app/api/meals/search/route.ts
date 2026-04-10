// src/app/api/meals/search/route.ts
import { NextResponse } from "next/server";
import { searchOpenFoodFacts } from "@/lib/api";

// Well-known Philippine fast food nutrition data (per serving/item, not per 100g)
// Sources: official brand nutritional guides
const PH_FAST_FOOD_DB: Record<string, Array<{
  id: string; name: string; brand: string;
  calories: number; protein: number; carbs: number; fat: number;
}>> = {
  jollibee: [
    { id: "jb-chickenjoy-1pc", name: "Chickenjoy 1pc (thigh)", brand: "Jollibee", calories: 320, protein: 26, carbs: 8, fat: 21 },
    { id: "jb-chickenjoy-breast", name: "Chickenjoy 1pc (breast)", brand: "Jollibee", calories: 290, protein: 30, carbs: 7, fat: 16 },
    { id: "jb-yumburger", name: "Yumburger", brand: "Jollibee", calories: 315, protein: 14, carbs: 35, fat: 13 },
    { id: "jb-champ", name: "Champ Burger", brand: "Jollibee", calories: 640, protein: 34, carbs: 47, fat: 35 },
    { id: "jb-jolly-spaghetti", name: "Jolly Spaghetti", brand: "Jollibee", calories: 540, protein: 18, carbs: 78, fat: 17 },
    { id: "jb-palabok-fiesta", name: "Palabok Fiesta", brand: "Jollibee", calories: 440, protein: 20, carbs: 65, fat: 11 },
    { id: "jb-peach-mango-pie", name: "Peach Mango Pie", brand: "Jollibee", calories: 225, protein: 2, carbs: 35, fat: 9 },
    { id: "jb-java-rice", name: "Java Rice", brand: "Jollibee", calories: 210, protein: 4, carbs: 44, fat: 2 },
    { id: "jb-burger-steak", name: "Burger Steak (1pc)", brand: "Jollibee", calories: 370, protein: 18, carbs: 30, fat: 18 },
    { id: "jb-jolly-hotdog", name: "Jolly Hotdog (Classic)", brand: "Jollibee", calories: 345, protein: 13, carbs: 38, fat: 15 },
  ],
  mcdo: [
    { id: "mc-mcdo-burger", name: "McDonalds Hamburger", brand: "McDonald's PH", calories: 250, protein: 13, carbs: 31, fat: 8 },
    { id: "mc-big-mac", name: "Big Mac", brand: "McDonald's PH", calories: 560, protein: 27, carbs: 43, fat: 31 },
    { id: "mc-mcchicken", name: "McChicken Sandwich", brand: "McDonald's PH", calories: 420, protein: 17, carbs: 42, fat: 20 },
    { id: "mc-quarter-pounder", name: "Quarter Pounder with Cheese", brand: "McDonald's PH", calories: 530, protein: 30, carbs: 41, fat: 27 },
    { id: "mc-fries-large", name: "Large Fries", brand: "McDonald's PH", calories: 490, protein: 6, carbs: 66, fat: 23 },
    { id: "mc-fries-medium", name: "Medium Fries", brand: "McDonald's PH", calories: 340, protein: 4, carbs: 44, fat: 16 },
    { id: "mc-mcflurry-oreo", name: "McFlurry Oreo", brand: "McDonald's PH", calories: 340, protein: 8, carbs: 52, fat: 11 },
    { id: "mc-sundae", name: "Hot Fudge Sundae", brand: "McDonald's PH", calories: 330, protein: 7, carbs: 53, fat: 10 },
    { id: "mc-filet-o-fish", name: "Filet-O-Fish", brand: "McDonald's PH", calories: 380, protein: 15, carbs: 38, fat: 17 },
    { id: "mc-fried-chicken", name: "McDonalds Fried Chicken (1pc)", brand: "McDonald's PH", calories: 350, protein: 28, carbs: 12, fat: 22 },
  ],
  chowking: [
    { id: "ck-lauriat-1", name: "Chowking Lauriat (Fried Chicken)", brand: "Chowking", calories: 620, protein: 32, carbs: 75, fat: 20 },
    { id: "ck-wonton-soup", name: "Wonton Soup (regular)", brand: "Chowking", calories: 220, protein: 12, carbs: 30, fat: 6 },
    { id: "ck-halo-halo", name: "Halo-Halo Special", brand: "Chowking", calories: 380, protein: 5, carbs: 75, fat: 8 },
    { id: "ck-beef-wonton", name: "Beef Wonton Noodles", brand: "Chowking", calories: 390, protein: 18, carbs: 58, fat: 9 },
    { id: "ck-yang-chow", name: "Yang Chow Fried Rice", brand: "Chowking", calories: 580, protein: 16, carbs: 85, fat: 19 },
    { id: "ck-pork-chao-fan", name: "Pork Chao Fan", brand: "Chowking", calories: 530, protein: 18, carbs: 80, fat: 14 },
    { id: "ck-siomai-4pc", name: "Siomai (4 pcs)", brand: "Chowking", calories: 200, protein: 12, carbs: 18, fat: 8 },
  ],
  "mang inasal": [
    { id: "mi-paa-inasal", name: "Paa Inasal (1pc)", brand: "Mang Inasal", calories: 260, protein: 24, carbs: 2, fat: 17 },
    { id: "mi-pecho-inasal", name: "Pecho Inasal (1pc)", brand: "Mang Inasal", calories: 210, protein: 28, carbs: 2, fat: 10 },
    { id: "mi-chicken-silog", name: "Chicken Inasal Silog", brand: "Mang Inasal", calories: 580, protein: 30, carbs: 65, fat: 20 },
    { id: "mi-goto", name: "Beef Goto", brand: "Mang Inasal", calories: 310, protein: 18, carbs: 38, fat: 9 },
    { id: "mi-unli-rice", name: "Rice (Unlimited, per cup)", brand: "Mang Inasal", calories: 180, protein: 3, carbs: 40, fat: 0 },
  ],
  kfc: [
    { id: "kfc-original-1pc", name: "KFC Original Recipe (1pc)", brand: "KFC PH", calories: 390, protein: 29, carbs: 11, fat: 26 },
    { id: "kfc-zinger", name: "Zinger Burger", brand: "KFC PH", calories: 520, protein: 26, carbs: 48, fat: 24 },
    { id: "kfc-fries-regular", name: "Regular Fries", brand: "KFC PH", calories: 310, protein: 4, carbs: 42, fat: 14 },
    { id: "kfc-coleslaw", name: "Coleslaw", brand: "KFC PH", calories: 150, protein: 1, carbs: 18, fat: 8 },
    { id: "kfc-gravy", name: "Gravy (cup)", brand: "KFC PH", calories: 60, protein: 2, carbs: 9, fat: 2 },
  ],
  greenwich: [
    { id: "gw-overload-pizza-slice", name: "Overload Pizza (1 slice)", brand: "Greenwich", calories: 290, protein: 14, carbs: 32, fat: 12 },
    { id: "gw-lasagna", name: "Baked Lasagna", brand: "Greenwich", calories: 420, protein: 20, carbs: 45, fat: 18 },
    { id: "gw-garlic-bread", name: "Garlic Bread (2 pcs)", brand: "Greenwich", calories: 180, protein: 4, carbs: 24, fat: 8 },
    { id: "gw-spaghetti", name: "Spaghetti Solo", brand: "Greenwich", calories: 390, protein: 14, carbs: 60, fat: 10 },
  ],
  "yellow cab": [
    { id: "yc-ny-classic-slice", name: "NY Classic Pizza (1 slice)", brand: "Yellow Cab", calories: 260, protein: 12, carbs: 30, fat: 10 },
    { id: "yc-cheese-sticks", name: "Cheese Sticks (6pcs)", brand: "Yellow Cab", calories: 340, protein: 10, carbs: 38, fat: 16 },
  ],
  "ministop": [
    { id: "ms-karaage", name: "Karaage Chicken (3pcs)", brand: "Ministop", calories: 320, protein: 20, carbs: 18, fat: 19 },
    { id: "ms-soft-serve", name: "Soft Serve Ice Cream", brand: "Ministop", calories: 150, protein: 3, carbs: 24, fat: 5 },
    { id: "ms-rice-meal-pork", name: "Pork Rice Meal", brand: "Ministop", calories: 540, protein: 22, carbs: 70, fat: 18 },
  ],
};

// All aliases that should map to a brand key
const BRAND_ALIASES: Record<string, string> = {
  "jollibee": "jollibee",
  "jb": "jollibee",
  "jolibee": "jollibee",
  "chickenjoy": "jollibee",
  "yumburger": "jollibee",
  "mcdonald": "mcdo",
  "mcdonalds": "mcdo",
  "mcdo": "mcdo",
  "mcdonald's": "mcdo",
  "big mac": "mcdo",
  "mcchicken": "mcdo",
  "chowking": "chowking",
  "chow king": "chowking",
  "mang inasal": "mang inasal",
  "inasalan": "mang inasal",
  "inasal": "mang inasal",
  "kfc": "kfc",
  "kentucky": "kfc",
  "greenwich": "greenwich",
  "yellow cab": "yellow cab",
  "yellowcab": "yellow cab",
  "ministop": "ministop",
};

function searchLocalPHDB(query: string) {
  const q = query.toLowerCase().trim();
  const results: typeof PH_FAST_FOOD_DB[string] = [];

  // Check if query directly matches a brand alias
  for (const [alias, brandKey] of Object.entries(BRAND_ALIASES)) {
    if (q.includes(alias)) {
      const brandItems = PH_FAST_FOOD_DB[brandKey] ?? [];
      // If query is just the brand name, return all items for that brand
      if (q === alias || q === brandKey) {
        results.push(...brandItems);
      } else {
        // Filter by item name within the brand
        const filtered = brandItems.filter(item =>
          item.name.toLowerCase().includes(q.replace(alias, "").trim()) ||
          q.includes(item.name.toLowerCase().split(" ").slice(-1)[0]) // last word match
        );
        results.push(...(filtered.length > 0 ? filtered : brandItems.slice(0, 4)));
      }
    }
  }

  if (results.length > 0) return results.slice(0, 8);

  // Generic keyword search across all items
  for (const items of Object.values(PH_FAST_FOOD_DB)) {
    for (const item of items) {
      if (
        item.name.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q)
      ) {
        results.push(item);
      }
    }
  }

  return results.slice(0, 8);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  if (!query) return NextResponse.json([]);

  try {
    // 1. Check local PH fast food database first
    const localResults = searchLocalPHDB(query);
    if (localResults.length > 0) {
      return NextResponse.json(localResults);
    }

    // 2. Fall back to Open Food Facts
    const offResults = await searchOpenFoodFacts(query);
    if (offResults.length > 0) {
      return NextResponse.json(offResults);
    }

    // 3. If both come up empty, use Claude to generate nutrition info for common PH items
    const claudeResult = await estimateWithClaude(query);
    if (claudeResult) {
      return NextResponse.json([claudeResult]);
    }

    return NextResponse.json([]);
  } catch (e) {
    console.error("Search error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

async function estimateWithClaude(query: string) {
  try {
    const prompt = `You are a nutrition database for Philippine food products and fast food.
The user searched for: "${query}"

If this is a real Philippine food product, fast food item, or common dish, provide its nutrition info.
If you don't recognize it, respond with null.

Respond ONLY with a valid JSON object or the word null:
{
  "id": "ai-generated",
  "name": "Exact product/dish name",
  "brand": "Brand name or empty string",
  "calories": 300,
  "protein": 15,
  "carbs": 35,
  "fat": 10
}

All macros are per standard serving. calories is kcal.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const raw = (data.content?.[0]?.text ?? "null").replace(/```json|```/g, "").trim();
    if (raw === "null") return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}