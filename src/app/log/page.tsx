"use client";
// src/app/log/page.tsx
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { PenLine, Package, Camera, Trash2, ChevronDown } from "lucide-react";
import type { MealLog } from "@/types";
import clsx from "clsx";

type EntryMode = "manual" | "product" | "image";
type MealType = "breakfast" | "lunch" | "dinner" | "snack";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

interface ProductResult {
  id: string;
  name: string;
  brand: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function LogFoodPage() {
  const [mode, setMode] = useState<EntryMode>("manual");
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [date] = useState(format(new Date(), "yyyy-MM-dd"));

  // Manual form
  const [manualForm, setManualForm] = useState({
    foodName: "", ingredients: "", calories: "", protein: "", carbs: "", fat: ""
  });

  // Product search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductResult | null>(null);
  const [servingSize, setServingSize] = useState(100);

  // Image
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDescription, setImageDescription] = useState("");
  const [imageEstimate, setImageEstimate] = useState<{ detectedFood: string; calories: number; protein: number; carbs: number; fat: number; note: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/meals?date=${date}`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setMeals(data);
    });
  }, [date]);

  // Product search with debounce
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/meals/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImageEstimate(null);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!imageFile && !imageDescription) return;
    setAnalyzing(true);
    const res = await fetch("/api/meals/analyze-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: imageDescription || imageFile?.name || "" }),
    });
    const data = await res.json();
    setImageEstimate(data);
    setAnalyzing(false);
  };

  const saveManual = async () => {
    if (!manualForm.foodName || !manualForm.calories) return;
    setSaving(true);
    const res = await fetch("/api/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mealType, entryType: "manual",
        foodName: manualForm.foodName,
        ingredients: manualForm.ingredients,
        calories: +manualForm.calories,
        protein: manualForm.protein ? +manualForm.protein : null,
        carbs: manualForm.carbs ? +manualForm.carbs : null,
        fat: manualForm.fat ? +manualForm.fat : null,
        date,
      }),
    });
    const meal = await res.json();
    setMeals(m => [...m, meal]);
    setManualForm({ foodName: "", ingredients: "", calories: "", protein: "", carbs: "", fat: "" });
    setSaving(false);
  };

  const saveProduct = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    const ratio = servingSize / 100;
    const res = await fetch("/api/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mealType, entryType: "product",
        foodName: selectedProduct.name,
        brandName: selectedProduct.brand,
        calories: Math.round(selectedProduct.calories * ratio),
        protein: Math.round(selectedProduct.protein * ratio),
        carbs: Math.round(selectedProduct.carbs * ratio),
        fat: Math.round(selectedProduct.fat * ratio),
        date,
      }),
    });
    const meal = await res.json();
    setMeals(m => [...m, meal]);
    setSelectedProduct(null);
    setSearchQuery("");
    setSaving(false);
  };

  const saveImage = async () => {
    if (!imageEstimate) return;
    setSaving(true);
    const res = await fetch("/api/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mealType, entryType: "image",
        foodName: imageEstimate.detectedFood,
        calories: imageEstimate.calories,
        protein: imageEstimate.protein,
        carbs: imageEstimate.carbs,
        fat: imageEstimate.fat,
        notes: imageEstimate.note,
        date,
      }),
    });
    const meal = await res.json();
    setMeals(m => [...m, meal]);
    setImageFile(null);
    setImagePreview(null);
    setImageEstimate(null);
    setImageDescription("");
    setSaving(false);
  };

  const deleteMeal = async (id: string) => {
    await fetch(`/api/meals/${id}`, { method: "DELETE" });
    setMeals(m => m.filter(x => x.id !== id));
  };

  const totalCalories = meals.reduce((s, m) => s + m.calories, 0);

  const tabs = [
    { id: "manual", label: "Manual", icon: PenLine },
    { id: "product", label: "Product", icon: Package },
    { id: "image", label: "Image AI", icon: Camera },
  ] as const;

  return (
    <div className="space-y-6 fade-up">
      <div>
        <h1 className="text-xl font-bold">Log Food</h1>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{format(new Date(), "EEEE, MMMM d")}</p>
      </div>

      {/* Meal type picker */}
      <div className="flex gap-2 flex-wrap">
        {MEAL_TYPES.map(t => (
          <button key={t} onClick={() => setMealType(t)}
            className={clsx("badge capitalize cursor-pointer transition-all", mealType === t ? "border" : "")}
            style={mealType === t
              ? { background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid var(--accent-dim)" }
              : { background: "var(--bg-card2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            {t}
          </button>
        ))}
      </div>

      {/* Entry mode tabs */}
      <div className="card">
        <div className="flex border-b mb-4" style={{ borderColor: "var(--border)" }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setMode(id as EntryMode)}
              className="flex-1 flex items-center justify-center gap-2 pb-3 text-sm font-medium transition-colors"
              style={{
                color: mode === id ? "var(--accent)" : "var(--text-muted)",
                borderBottom: mode === id ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: -1,
              }}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Manual Entry */}
        {mode === "manual" && (
          <div className="space-y-3">
            <input placeholder="Food name (e.g. Chicken adobo)" value={manualForm.foodName}
              onChange={e => setManualForm(f => ({ ...f, foodName: e.target.value }))} />
            <textarea placeholder="Ingredients (optional)" rows={2} value={manualForm.ingredients}
              onChange={e => setManualForm(f => ({ ...f, ingredients: e.target.value }))} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Calories *</label>
                <input type="number" placeholder="kcal" value={manualForm.calories}
                  onChange={e => setManualForm(f => ({ ...f, calories: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Protein (g)</label>
                <input type="number" placeholder="g" value={manualForm.protein}
                  onChange={e => setManualForm(f => ({ ...f, protein: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Carbs (g)</label>
                <input type="number" placeholder="g" value={manualForm.carbs}
                  onChange={e => setManualForm(f => ({ ...f, carbs: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Fat (g)</label>
                <input type="number" placeholder="g" value={manualForm.fat}
                  onChange={e => setManualForm(f => ({ ...f, fat: e.target.value }))} />
              </div>
            </div>
            <button className="btn-primary w-full" onClick={saveManual} disabled={saving || !manualForm.foodName || !manualForm.calories}>
              {saving ? "Saving..." : "Add Meal"}
            </button>
          </div>
        )}

        {/* Product Entry */}
        {mode === "product" && (
          <div className="space-y-3">
            <div className="relative">
              <input placeholder="Search by product or brand name..." value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSelectedProduct(null); }} />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 rounded-full animate-spin"
                    style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
                </div>
              )}
            </div>
            {/* Search results dropdown */}
            {searchResults.length > 0 && !selectedProduct && (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-card2)" }}>
                {searchResults.map(p => (
                  <button key={p.id} onClick={() => { setSelectedProduct(p); setSearchQuery(p.name); setSearchResults([]); }}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/5 transition-colors border-b last:border-0"
                    style={{ borderColor: "var(--border)" }}>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {p.brand} · {p.calories} kcal/100g
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedProduct && (
              <div className="space-y-3">
                <div className="rounded-xl p-3 text-sm" style={{ background: "var(--bg-card2)", border: "1px solid var(--accent-dim)" }}>
                  <div className="font-medium" style={{ color: "var(--accent)" }}>{selectedProduct.name}</div>
                  {selectedProduct.brand && <div className="text-xs" style={{ color: "var(--text-muted)" }}>{selectedProduct.brand}</div>}
                  <div className="grid grid-cols-4 gap-2 mt-2 text-xs text-center">
                    {["calories", "protein", "carbs", "fat"].map(k => (
                      <div key={k}>
                        <div style={{ color: "var(--accent)" }}>
                          {Math.round((selectedProduct[k as keyof ProductResult] as number) * servingSize / 100)}
                        </div>
                        <div style={{ color: "var(--text-dim)" }} className="capitalize">{k}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Serving size (g)</label>
                  <input type="number" value={servingSize} min={1}
                    onChange={e => setServingSize(+e.target.value)} />
                </div>
                <button className="btn-primary w-full" onClick={saveProduct} disabled={saving}>
                  {saving ? "Saving..." : "Add to Log"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Image Entry */}
        {mode === "image" && (
          <div className="space-y-3">
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-8 cursor-pointer transition-colors hover:border-green-500"
              style={{ borderColor: "var(--border)" }}>
              {imagePreview ? (
                <img src={imagePreview} alt="food" className="max-h-40 rounded-lg object-cover" />
              ) : (
                <>
                  <Camera size={28} style={{ color: "var(--text-dim)" }} />
                  <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>Click to upload food photo</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>
                Describe the food (helps AI estimate)
              </label>
              <input placeholder="e.g. bowl of pasta, pizza slice, chicken salad..."
                value={imageDescription}
                onChange={e => setImageDescription(e.target.value)} />
            </div>
            <button className="btn-ghost w-full" onClick={analyzeImage}
              disabled={analyzing || (!imageFile && !imageDescription)}>
              {analyzing ? "Analyzing..." : "Analyze Food"}
            </button>

            {imageEstimate && (
              <div className="rounded-xl p-3 space-y-2" style={{ background: "var(--bg-card2)", border: "1px solid var(--accent-dim)" }}>
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize" style={{ color: "var(--accent)" }}>
                    {imageEstimate.detectedFood}
                  </span>
                  <span className="text-xs badge" style={{ background: "var(--accent-glow)", color: "var(--text-muted)" }}>
                    AI estimate
                  </span>
                </div>
                <p className="text-xs" style={{ color: "var(--text-dim)" }}>{imageEstimate.note}</p>
                <div className="grid grid-cols-4 gap-2 text-xs text-center">
                  {["calories", "protein", "carbs", "fat"].map(k => (
                    <div key={k}>
                      <div style={{ color: "var(--text)" }}>{imageEstimate[k as keyof typeof imageEstimate]}</div>
                      <div style={{ color: "var(--text-dim)" }} className="capitalize">{k}</div>
                    </div>
                  ))}
                </div>
                <button className="btn-primary w-full text-sm" onClick={saveImage} disabled={saving}>
                  {saving ? "Saving..." : "Add to Log"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Today's log */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Today's Log</h3>
          <span className="text-sm font-medium" style={{ color: "var(--accent)" }}>
            {totalCalories} kcal total
          </span>
        </div>
        {meals.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: "var(--text-dim)" }}>No meals logged today</p>
        ) : (
          <div className="space-y-2">
            {meals.map(m => (
              <div key={m.id} className="flex items-center justify-between text-sm py-2 border-b group"
                style={{ borderColor: "var(--border)" }}>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{m.foodName}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {m.mealType}
                    {m.protein ? ` · P:${m.protein}g` : ""}
                    {m.carbs ? ` C:${m.carbs}g` : ""}
                    {m.fat ? ` F:${m.fat}g` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span style={{ color: "var(--accent)" }}>{m.calories} kcal</span>
                  <button onClick={() => deleteMeal(m.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "var(--danger)" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}