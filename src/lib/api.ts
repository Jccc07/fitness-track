// src/lib/api.ts
export async function fetchOpenFoodFacts(barcode: string) {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
  );
  if (!res.ok) throw new Error("Product not found");
  const data = await res.json();
  if (data.status !== 1) throw new Error("Product not found");
  const p = data.product;
  const per100 = p.nutriments;
  return {
    name: p.product_name || "Unknown",
    brand: p.brands || "",
    calories: per100["energy-kcal_100g"] ?? per100["energy-kcal"] ?? 0,
    protein: per100["proteins_100g"] ?? 0,
    carbs: per100["carbohydrates_100g"] ?? 0,
    fat: per100["fat_100g"] ?? 0,
    servingSize: p.serving_size || "100g",
  };
}

export async function searchOpenFoodFacts(query: string) {
  const res = await fetch(
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=5`
  );
  if (!res.ok) throw new Error("Search failed");
  const data = await res.json();
  return (data.products || []).map((p: Record<string, unknown>) => {
    const n = (p.nutriments as Record<string, number>) || {};
    return {
      id: p.id,
      name: p.product_name || "Unknown",
      brand: p.brands || "",
      calories: n["energy-kcal_100g"] ?? n["energy-kcal"] ?? 0,
      protein: n["proteins_100g"] ?? 0,
      carbs: n["carbohydrates_100g"] ?? 0,
      fat: n["fat_100g"] ?? 0,
    };
  });
}

// Simple food calorie lookup table for image-based estimation
export const FOOD_CALORIE_ESTIMATES: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {
  pizza: { calories: 285, protein: 12, carbs: 36, fat: 10 },
  burger: { calories: 354, protein: 17, carbs: 29, fat: 17 },
  salad: { calories: 150, protein: 5, carbs: 15, fat: 8 },
  rice: { calories: 206, protein: 4, carbs: 45, fat: 0 },
  chicken: { calories: 239, protein: 27, carbs: 0, fat: 14 },
  pasta: { calories: 220, protein: 8, carbs: 43, fat: 1 },
  bread: { calories: 265, protein: 9, carbs: 49, fat: 3 },
  egg: { calories: 155, protein: 13, carbs: 1, fat: 11 },
  fish: { calories: 206, protein: 22, carbs: 0, fat: 12 },
  soup: { calories: 80, protein: 4, carbs: 10, fat: 2 },
  sandwich: { calories: 290, protein: 14, carbs: 38, fat: 9 },
  steak: { calories: 271, protein: 26, carbs: 0, fat: 18 },
  fries: { calories: 312, protein: 3, carbs: 41, fat: 15 },
  sushi: { calories: 200, protein: 10, carbs: 38, fat: 1 },
  default: { calories: 250, protein: 8, carbs: 30, fat: 10 },
};