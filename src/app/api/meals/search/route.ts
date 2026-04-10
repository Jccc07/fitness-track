// src/app/api/meals/search/route.ts
import { NextResponse } from "next/server";
import { searchOpenFoodFacts } from "@/lib/api";

// ─── PH fast food & local grocery database ───────────────────────────────────
// perServing: true  → calories/macros are for ONE serving (not per 100g)
// perServing: false → calories/macros are per 100g (same as Open Food Facts)

const PH_DB = [
  // ── Jollibee ──────────────────────────────────────────────────────────────
  { id: "jb-chickenjoy-thigh",   name: "Chickenjoy 1pc (thigh)",       brand: "Jollibee",        calories: 320, protein: 26, carbs: 8,  fat: 21, perServing: true },
  { id: "jb-chickenjoy-breast",  name: "Chickenjoy 1pc (breast)",      brand: "Jollibee",        calories: 290, protein: 30, carbs: 7,  fat: 16, perServing: true },
  { id: "jb-yumburger",          name: "Yumburger",                    brand: "Jollibee",        calories: 315, protein: 14, carbs: 35, fat: 13, perServing: true },
  { id: "jb-champ",              name: "Champ Burger",                 brand: "Jollibee",        calories: 640, protein: 34, carbs: 47, fat: 35, perServing: true },
  { id: "jb-jolly-spaghetti",    name: "Jolly Spaghetti",              brand: "Jollibee",        calories: 540, protein: 18, carbs: 78, fat: 17, perServing: true },
  { id: "jb-palabok-fiesta",     name: "Palabok Fiesta",               brand: "Jollibee",        calories: 440, protein: 20, carbs: 65, fat: 11, perServing: true },
  { id: "jb-burger-steak",       name: "Burger Steak 1pc",             brand: "Jollibee",        calories: 370, protein: 18, carbs: 30, fat: 18, perServing: true },
  { id: "jb-jolly-hotdog",       name: "Jolly Hotdog Classic",         brand: "Jollibee",        calories: 345, protein: 13, carbs: 38, fat: 15, perServing: true },
  { id: "jb-java-rice",          name: "Java Rice",                    brand: "Jollibee",        calories: 210, protein: 4,  carbs: 44, fat: 2,  perServing: true },
  { id: "jb-peach-mango-pie",    name: "Peach Mango Pie",              brand: "Jollibee",        calories: 225, protein: 2,  carbs: 35, fat: 9,  perServing: true },
  { id: "jb-sundae",             name: "Jollibee Sundae",              brand: "Jollibee",        calories: 230, protein: 4,  carbs: 37, fat: 8,  perServing: true },
  { id: "jb-fries-regular",      name: "Jolly Crispy Fries (regular)", brand: "Jollibee",        calories: 270, protein: 3,  carbs: 36, fat: 13, perServing: true },

  // ── McDonald's PH ─────────────────────────────────────────────────────────
  { id: "mc-hamburger",          name: "Hamburger",                    brand: "McDonald's PH",   calories: 250, protein: 13, carbs: 31, fat: 8,  perServing: true },
  { id: "mc-big-mac",            name: "Big Mac",                      brand: "McDonald's PH",   calories: 560, protein: 27, carbs: 43, fat: 31, perServing: true },
  { id: "mc-mcchicken",          name: "McChicken",                    brand: "McDonald's PH",   calories: 420, protein: 17, carbs: 42, fat: 20, perServing: true },
  { id: "mc-quarter-pounder",    name: "Quarter Pounder with Cheese",  brand: "McDonald's PH",   calories: 530, protein: 30, carbs: 41, fat: 27, perServing: true },
  { id: "mc-fries-large",        name: "Large Fries",                  brand: "McDonald's PH",   calories: 490, protein: 6,  carbs: 66, fat: 23, perServing: true },
  { id: "mc-fries-medium",       name: "Medium Fries",                 brand: "McDonald's PH",   calories: 340, protein: 4,  carbs: 44, fat: 16, perServing: true },
  { id: "mc-filet-o-fish",       name: "Filet-O-Fish",                 brand: "McDonald's PH",   calories: 380, protein: 15, carbs: 38, fat: 17, perServing: true },
  { id: "mc-fried-chicken",      name: "Fried Chicken 1pc",            brand: "McDonald's PH",   calories: 350, protein: 28, carbs: 12, fat: 22, perServing: true },
  { id: "mc-mcflurry-oreo",      name: "McFlurry Oreo",                brand: "McDonald's PH",   calories: 340, protein: 8,  carbs: 52, fat: 11, perServing: true },

  // ── Chowking ──────────────────────────────────────────────────────────────
  { id: "ck-wonton-soup",        name: "Wonton Soup (regular)",        brand: "Chowking",        calories: 220, protein: 12, carbs: 30, fat: 6,  perServing: true },
  { id: "ck-halo-halo",          name: "Halo-Halo Special",            brand: "Chowking",        calories: 380, protein: 5,  carbs: 75, fat: 8,  perServing: true },
  { id: "ck-yang-chow",          name: "Yang Chow Fried Rice",         brand: "Chowking",        calories: 580, protein: 16, carbs: 85, fat: 19, perServing: true },
  { id: "ck-pork-chao-fan",      name: "Pork Chao Fan",                brand: "Chowking",        calories: 530, protein: 18, carbs: 80, fat: 14, perServing: true },
  { id: "ck-siomai-4pc",         name: "Siomai 4pcs",                  brand: "Chowking",        calories: 200, protein: 12, carbs: 18, fat: 8,  perServing: true },
  { id: "ck-beef-wonton-noodle", name: "Beef Wonton Noodles",          brand: "Chowking",        calories: 390, protein: 18, carbs: 58, fat: 9,  perServing: true },
  { id: "ck-fried-chicken",      name: "Fried Chicken 1pc",            brand: "Chowking",        calories: 290, protein: 22, carbs: 14, fat: 17, perServing: true },

  // ── Mang Inasal ───────────────────────────────────────────────────────────
  { id: "mi-paa-inasal",         name: "Paa Inasal 1pc",               brand: "Mang Inasal",     calories: 260, protein: 24, carbs: 2,  fat: 17, perServing: true },
  { id: "mi-pecho-inasal",       name: "Pecho Inasal 1pc",             brand: "Mang Inasal",     calories: 210, protein: 28, carbs: 2,  fat: 10, perServing: true },
  { id: "mi-chicken-silog",      name: "Chicken Inasal Silog",         brand: "Mang Inasal",     calories: 580, protein: 30, carbs: 65, fat: 20, perServing: true },
  { id: "mi-goto",               name: "Beef Goto",                    brand: "Mang Inasal",     calories: 310, protein: 18, carbs: 38, fat: 9,  perServing: true },
  { id: "mi-rice",               name: "Steamed Rice (cup)",           brand: "Mang Inasal",     calories: 180, protein: 3,  carbs: 40, fat: 0,  perServing: true },

  // ── KFC PH ────────────────────────────────────────────────────────────────
  { id: "kfc-original-1pc",      name: "Original Recipe 1pc",          brand: "KFC PH",          calories: 390, protein: 29, carbs: 11, fat: 26, perServing: true },
  { id: "kfc-zinger",            name: "Zinger Burger",                brand: "KFC PH",          calories: 520, protein: 26, carbs: 48, fat: 24, perServing: true },
  { id: "kfc-fries-regular",     name: "Regular Fries",                brand: "KFC PH",          calories: 310, protein: 4,  carbs: 42, fat: 14, perServing: true },
  { id: "kfc-coleslaw",          name: "Coleslaw",                     brand: "KFC PH",          calories: 150, protein: 1,  carbs: 18, fat: 8,  perServing: true },
  { id: "kfc-gravy",             name: "Gravy (cup)",                  brand: "KFC PH",          calories: 60,  protein: 2,  carbs: 9,  fat: 2,  perServing: true },

  // ── Greenwich ─────────────────────────────────────────────────────────────
  { id: "gw-pizza-slice",        name: "Overload Pizza 1 slice",       brand: "Greenwich",       calories: 290, protein: 14, carbs: 32, fat: 12, perServing: true },
  { id: "gw-lasagna",            name: "Baked Lasagna",                brand: "Greenwich",       calories: 420, protein: 20, carbs: 45, fat: 18, perServing: true },
  { id: "gw-spaghetti",          name: "Spaghetti Solo",               brand: "Greenwich",       calories: 390, protein: 14, carbs: 60, fat: 10, perServing: true },
  { id: "gw-garlic-bread",       name: "Garlic Bread 2pcs",            brand: "Greenwich",       calories: 180, protein: 4,  carbs: 24, fat: 8,  perServing: true },

  // ── Ministop ──────────────────────────────────────────────────────────────
  { id: "ms-karaage-3pc",        name: "Karaage Chicken 3pcs",         brand: "Ministop",        calories: 320, protein: 20, carbs: 18, fat: 19, perServing: true },
  { id: "ms-rice-meal-pork",     name: "Pork Rice Meal",               brand: "Ministop",        calories: 540, protein: 22, carbs: 70, fat: 18, perServing: true },
  { id: "ms-soft-serve",         name: "Soft Serve Ice Cream",         brand: "Ministop",        calories: 150, protein: 3,  carbs: 24, fat: 5,  perServing: true },

  // ── Yellow Cab ────────────────────────────────────────────────────────────
  { id: "yc-ny-classic-slice",   name: "NY Classic Pizza 1 slice",     brand: "Yellow Cab",      calories: 260, protein: 12, carbs: 30, fat: 10, perServing: true },
  { id: "yc-cheese-sticks",      name: "Cheese Sticks 6pcs",           brand: "Yellow Cab",      calories: 340, protein: 10, carbs: 38, fat: 16, perServing: true },

  // ── Local grocery / packaged (per 100g) ──────────────────────────────────
  { id: "lm-pancit-canton",      name: "Pancit Canton (1 pack cooked)",brand: "Lucky Me",        calories: 330, protein: 9,  carbs: 52, fat: 10, perServing: true },
  { id: "lm-instant-noodle",     name: "Instant Noodles (1 pack)",     brand: "Lucky Me",        calories: 290, protein: 7,  carbs: 45, fat: 9,  perServing: true },
  { id: "lm-go-cup",             name: "Lucky Me Go Cup (cooked)",     brand: "Lucky Me",        calories: 220, protein: 5,  carbs: 35, fat: 7,  perServing: true },
  { id: "mega-sardines-tomato",  name: "Sardines in Tomato Sauce",     brand: "Mega",            calories: 190, protein: 18, carbs: 4,  fat: 11, perServing: true },
  { id: "mega-sardines-oil",     name: "Sardines in Oil",              brand: "Mega",            calories: 240, protein: 19, carbs: 0,  fat: 17, perServing: true },
  { id: "555-sardines",          name: "Sardines in Tomato Sauce",     brand: "555",             calories: 185, protein: 17, carbs: 5,  fat: 11, perServing: true },
  { id: "argentina-corned-beef", name: "Corned Beef (1 can, 175g)",    brand: "Argentina",       calories: 290, protein: 22, carbs: 6,  fat: 20, perServing: true },
  { id: "purefoods-corned-beef", name: "Corned Beef (1 can, 175g)",    brand: "Purefoods",       calories: 280, protein: 21, carbs: 7,  fat: 19, perServing: true },
  { id: "ligo-sardines",         name: "Sardines in Tomato Sauce",     brand: "Ligo",            calories: 188, protein: 17, carbs: 4,  fat: 12, perServing: true },
  { id: "spam-regular",          name: "Spam Classic (1 slice, 56g)",  brand: "Spam",            calories: 180, protein: 7,  carbs: 2,  fat: 16, perServing: true },
  { id: "maling-luncheon",       name: "Pork Luncheon Meat (1 slice)", brand: "Maling",          calories: 120, protein: 6,  carbs: 2,  fat: 10, perServing: true },
  { id: "del-monte-ketchup",     name: "Tomato Ketchup (1 tbsp)",      brand: "Del Monte",       calories: 20,  protein: 0,  carbs: 5,  fat: 0,  perServing: true },
  { id: "rey-palm-oil",          name: "Palm Oil (1 tbsp)",            brand: "Baguio Oil",      calories: 120, protein: 0,  carbs: 0,  fat: 14, perServing: true },
  { id: "sun-rice-white",        name: "White Rice (1 cup cooked)",    brand: "Generic PH",      calories: 206, protein: 4,  carbs: 45, fat: 0,  perServing: true },
  { id: "sun-rice-brown",        name: "Brown Rice (1 cup cooked)",    brand: "Generic PH",      calories: 216, protein: 5,  carbs: 45, fat: 2,  perServing: true },
  { id: "gardenia-bread",        name: "White Bread (1 slice)",        brand: "Gardenia",        calories: 70,  protein: 2,  carbs: 13, fat: 1,  perServing: true },
  { id: "rebisco-crackers",      name: "Crackers (4pcs)",              brand: "Rebisco",         calories: 90,  protein: 2,  carbs: 15, fat: 3,  perServing: true },
  { id: "champion-tocino",       name: "Chicken Tocino (1 pack, 250g)",brand: "Champion",        calories: 420, protein: 28, carbs: 40, fat: 15, perServing: true },
  { id: "purefoods-hotdog",      name: "Hotdog 1pc",                   brand: "Purefoods",       calories: 160, protein: 6,  carbs: 5,  fat: 13, perServing: true },
  { id: "tender-juicy-hotdog",   name: "Hotdog 1pc",                   brand: "Tender Juicy",    calories: 155, protein: 6,  carbs: 4,  fat: 13, perServing: true },
  { id: "nescafe-3in1",          name: "3-in-1 Coffee (1 sachet)",     brand: "Nescafé",         calories: 55,  protein: 1,  carbs: 10, fat: 1,  perServing: true },
  { id: "milo-powder",           name: "Milo (1 serving, 20g)",        brand: "Milo",            calories: 80,  protein: 3,  carbs: 15, fat: 1,  perServing: true },
];

// ─── Simple keyword search against the local DB ───────────────────────────────
function searchLocalDB(query: string) {
  const q = query.toLowerCase().trim();
  const tokens = q.split(/\s+/);

  return PH_DB.filter(item => {
    const haystack = `${item.name} ${item.brand}`.toLowerCase();
    // All tokens must appear somewhere in the name or brand
    return tokens.every(t => haystack.includes(t));
  }).slice(0, 6);
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  if (!query || query.trim().length < 2) return NextResponse.json([]);

  try {
    // Run both sources in parallel
    const [localResults, offResults] = await Promise.all([
      Promise.resolve(searchLocalDB(query)),
      searchOpenFoodFacts(query).catch(() => []),
    ]);

    // Merge: local PH DB first, then Open Food Facts (deduplicated by name+brand)
    const seen = new Set<string>();
    const merged: typeof PH_DB = [];

    for (const item of localResults) {
      const key = `${item.name.toLowerCase()}|${item.brand.toLowerCase()}`;
      if (!seen.has(key)) { seen.add(key); merged.push(item); }
    }

    for (const item of offResults) {
      const key = `${String(item.name).toLowerCase()}|${String(item.brand).toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({ ...item, perServing: false }); // OFF returns per-100g
      }
    }

    return NextResponse.json(merged.slice(0, 10));
  } catch (e) {
    console.error("Search error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}