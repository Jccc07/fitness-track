// src/app/api/meals/search/route.ts
import { NextResponse } from "next/server";
import { searchOpenFoodFacts } from "@/lib/api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  if (!query) return NextResponse.json([]);
  try {
    const results = await searchOpenFoodFacts(query);
    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}