"use client";
// src/app/log/page.tsx
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import {
  PenLine, Package, Camera, Trash2, Plus, Loader2, Sparkles,
  ShoppingCart, Check, X, ChevronDown, ChevronUp, AlertCircle,
} from "lucide-react";
import type { MealLog } from "@/types";

type EntryMode = "manual" | "product" | "image";
type MealType = "breakfast" | "lunch" | "dinner" | "snack";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

interface CartItem {
  id: string;
  foodName: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: "manual" | "product" | "image";
}

interface ProductResult {
  id: string;
  name: string;
  brand: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  perServing?: boolean; // true = calories already per-serving (PH fast food)
}

interface ImageFoodItem {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// ─── Error banner ─────────────────────────────────────────────────────────────
function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm"
      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
    >
      <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss}><X size={14} /></button>
    </div>
  );
}

// ─── Meal detail modal ────────────────────────────────────────────────────────
function MealDetailModal({ meal, onClose }: { meal: MealLog; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-5 space-y-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base leading-snug">{meal.foodName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid var(--accent-dim)" }}>
                {meal.mealType}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                style={{ background: "var(--bg-card2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                {meal.entryType}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}><X size={18} /></button>
        </div>
        <div className="rounded-xl p-4 text-center"
          style={{ background: "var(--accent-glow)", border: "1px solid var(--accent-dim)" }}>
          <div className="text-3xl font-bold" style={{ color: "var(--accent)", fontFamily: "Syne, sans-serif" }}>
            {meal.calories}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>kilocalories</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Protein", value: meal.protein, color: "#60a5fa" },
            { label: "Carbs",   value: meal.carbs,   color: "#f59e0b" },
            { label: "Fat",     value: meal.fat,      color: "#f472b6" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-3 text-center"
              style={{ background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
              <div className="text-lg font-bold" style={{ color }}>{value ?? 0}g</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2 text-sm" style={{ color: "var(--text-muted)" }}>
          {meal.brandName && (
            <div className="flex justify-between">
              <span>Brand</span>
              <span className="font-medium" style={{ color: "var(--text)" }}>{meal.brandName}</span>
            </div>
          )}
          {meal.notes && (
            <div className="flex justify-between">
              <span>Notes</span>
              <span className="font-medium text-right max-w-[60%]" style={{ color: "var(--text)" }}>{meal.notes}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Date</span>
            <span className="font-medium" style={{ color: "var(--text)" }}>{meal.date}</span>
          </div>
        </div>
        <button onClick={onClose}
          className="w-full py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: "var(--bg-card2)", color: "var(--text)", border: "1px solid var(--border)" }}>
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LogFoodPage() {
  const [mode, setMode] = useState<EntryMode>("manual");
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [date] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedMeal, setSelectedMeal] = useState<MealLog | null>(null);

  // Cart — always rendered
  const [cart, setCart] = useState<CartItem[]>([]);

  // Manual
  const [manualFood, setManualFood] = useState("");
  const [manualIngredients, setManualIngredients] = useState("");
  const [manualPortion, setManualPortion] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [manualEstimate, setManualEstimate] = useState<CartItem | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  // Product
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductResult | null>(null);
  const [servingQty, setServingQty] = useState(1);

  // Image
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState("image/jpeg");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDescription, setImageDescription] = useState("");
  const [imageItems, setImageItems] = useState<ImageFoodItem[]>([]);
  const [selectedImageItems, setSelectedImageItems] = useState<Set<number>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Log groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/meals?date=${date}`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setMeals(data);
    });
  }, [date]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/meals/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch { setSearchResults([]); }
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Manual estimate ───────────────────────────────────────────────────────
  const estimateManual = async () => {
    if (!manualFood.trim()) return;
    setEstimating(true); setManualEstimate(null); setEstimateError(null);
    try {
      const res = await fetch("/api/meals/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foodName: manualFood, ingredients: manualIngredients, portion: manualPortion }),
      });
      const data = await res.json();
      if (data.error) { setEstimateError(data.error); }
      else {
        setManualEstimate({
          id: Date.now().toString(),
          foodName: data.name || manualFood,
          portion: data.portion || manualPortion || "1 serving",
          calories: data.calories || 0,
          protein: data.protein || 0,
          carbs: data.carbs || 0,
          fat: data.fat || 0,
          source: "manual",
        });
      }
    } catch { setEstimateError("Network error — please check your connection and try again."); }
    setEstimating(false);
  };

  const addManualToCart = () => {
    if (!manualEstimate) return;
    setCart(c => [...c, { ...manualEstimate! }]);
    setManualFood(""); setManualIngredients(""); setManualPortion(""); setManualEstimate(null);
  };

  // ── Product add to cart ───────────────────────────────────────────────────
  const addProductToCart = () => {
    if (!selectedProduct) return;
    const qty = servingQty || 1;
    const ratio = selectedProduct.perServing ? qty : qty / 100;
    setCart(c => [...c, {
      id: Date.now().toString(),
      foodName: selectedProduct.brand
        ? `${selectedProduct.name} (${selectedProduct.brand})`
        : selectedProduct.name,
      portion: selectedProduct.perServing ? `${qty} serving${qty !== 1 ? "s" : ""}` : `${qty}g`,
      calories: Math.round(selectedProduct.calories * ratio),
      protein:  Math.round(selectedProduct.protein  * ratio),
      carbs:    Math.round(selectedProduct.carbs    * ratio),
      fat:      Math.round(selectedProduct.fat      * ratio),
      source: "product",
    }]);
    setSelectedProduct(null); setSearchQuery(""); setServingQty(1); setSearchResults([]);
  };

  // ── Image ─────────────────────────────────────────────────────────────────
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageItems([]); setSelectedImageItems(new Set()); setAnalyzeError(null);
    setImageMime(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      setImagePreview(result);
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!imageBase64 && !imageDescription) return;
    setAnalyzing(true); setImageItems([]); setAnalyzeError(null);
    try {
      const res = await fetch("/api/meals/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType: imageMime, description: imageDescription }),
      });
      const data = await res.json();
      if (data.error) { setAnalyzeError(data.error); }
      else if (data.items?.length) {
        setImageItems(data.items);
        setSelectedImageItems(new Set(data.items.map((_: ImageFoodItem, i: number) => i)));
      } else { setAnalyzeError("No food items detected. Try adding a description below."); }
    } catch { setAnalyzeError("Network error — please check your connection and try again."); }
    setAnalyzing(false);
  };

  const toggleImageItem = (idx: number) => {
    setSelectedImageItems(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const addImageItemsToCart = () => {
    const toAdd = imageItems
      .filter((_, i) => selectedImageItems.has(i))
      .map((item, i) => ({
        id: `img-${Date.now()}-${i}`,
        foodName: item.name, portion: item.portion,
        calories: item.calories, protein: item.protein || 0,
        carbs: item.carbs || 0, fat: item.fat || 0,
        source: "image" as const,
      }));
    setCart(c => [...c, ...toAdd]);
    setImageItems([]); setImagePreview(null); setImageBase64(null);
    setImageDescription(""); setSelectedImageItems(new Set());
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── Cart ──────────────────────────────────────────────────────────────────
  const removeFromCart = (id: string) => setCart(c => c.filter(x => x.id !== id));

  const cartTotals = {
    calories: cart.reduce((s, i) => s + i.calories, 0),
    protein:  cart.reduce((s, i) => s + i.protein,  0),
    carbs:    cart.reduce((s, i) => s + i.carbs,    0),
    fat:      cart.reduce((s, i) => s + i.fat,      0),
  };

  const logMeal = async () => {
    if (cart.length === 0) return;
    setSaving(true);
    const newMeals: MealLog[] = [];
    for (const item of cart) {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealType, entryType: item.source, foodName: item.foodName,
          calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat, date,
        }),
      });
      const meal = await res.json();
      if (!meal.error) newMeals.push(meal);
    }
    setMeals(m => [...m, ...newMeals]);
    setCart([]);
    setSaving(false);
  };

  // ── Today's log ───────────────────────────────────────────────────────────
  const deleteMeal = async (id: string) => {
    await fetch(`/api/meals/${id}`, { method: "DELETE" });
    setMeals(m => m.filter(x => x.id !== id));
    if (selectedMeal?.id === id) setSelectedMeal(null);
  };

  const toggleGroup = (type: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const totalCalories = meals.reduce((s, m) => s + m.calories, 0);
  const mealsByType = MEAL_TYPES
    .map(type => ({
      type,
      items: meals.filter(m => m.mealType === type),
      total: meals.filter(m => m.mealType === type).reduce((s, m) => s + m.calories, 0),
    }))
    .filter(g => g.items.length > 0);

  const tabs = [
    { id: "manual",  label: "Manual",   icon: PenLine },
    { id: "product", label: "Product",  icon: Package },
    { id: "image",   label: "Image AI", icon: Camera  },
  ] as const;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 fade-up">
      {selectedMeal && (
        <MealDetailModal meal={selectedMeal} onClose={() => setSelectedMeal(null)} />
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Log Food</h1>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{format(new Date(), "EEEE, MMMM d")}</p>
      </div>

      {/* Meal type picker */}
      <div className="flex gap-2 flex-wrap">
        {MEAL_TYPES.map(t => (
          <button key={t} onClick={() => setMealType(t)}
            className="px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all cursor-pointer"
            style={mealType === t
              ? { background: "var(--accent)", color: "#000" }
              : { background: "var(--bg-card2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            {t}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════
          CART — always visible, shows empty state
          ══════════════════════════════════════════════ */}
      <div className="card" style={{
        border: cart.length > 0 ? "1px solid var(--accent-dim)" : "1px solid var(--border)",
        background: cart.length > 0 ? "var(--accent-glow)" : "var(--bg-card)",
        transition: "background 0.2s, border-color 0.2s",
      }}>
        {/* Cart header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 font-semibold text-sm"
            style={{ color: cart.length > 0 ? "var(--accent)" : "var(--text-muted)" }}>
            <ShoppingCart size={16} />
            {cart.length > 0
              ? `Meal cart · ${cart.length} item${cart.length > 1 ? "s" : ""}`
              : "Meal cart"}
          </div>
          {cart.length > 0 && (
            <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>
              {cartTotals.calories} kcal
            </span>
          )}
        </div>

        {/* Empty state */}
        {cart.length === 0 && (
          <div className="text-center py-5 rounded-xl border-2 border-dashed"
            style={{ borderColor: "var(--border)" }}>
            <ShoppingCart size={22} className="mx-auto mb-2" style={{ color: "var(--text-dim)" }} />
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Your meal cart is empty
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
              Add food items below — mix Manual, Product, and Image AI.
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>
              Build your full {mealType} first, then log it all at once.
            </p>
          </div>
        )}

        {/* Items */}
        {cart.length > 0 && (
          <>
            <div className="space-y-0 mb-3">
              {cart.map(item => (
                <div key={item.id}
                  className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                  style={{ borderColor: "rgba(var(--accent-rgb, 150,150,150),0.2)" }}>
                  <div className="flex-1 min-w-0 pr-2">
                    <span className="font-medium truncate block">{item.foodName}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {item.portion} · P:{item.protein}g C:{item.carbs}g F:{item.fat}g
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-semibold" style={{ color: "var(--accent)" }}>{item.calories} kcal</span>
                    <button onClick={() => removeFromCart(item.id)} style={{ color: "var(--danger)" }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Macro summary */}
            <div className="flex gap-2 text-xs mb-3">
              {[["Protein", cartTotals.protein, "g"], ["Carbs", cartTotals.carbs, "g"], ["Fat", cartTotals.fat, "g"]].map(([k, v, u]) => (
                <div key={k as string} className="flex-1 text-center py-2 rounded-lg"
                  style={{ background: "var(--bg-card)" }}>
                  <div className="font-bold text-sm">{v}{u}</div>
                  <div style={{ color: "var(--text-muted)" }}>{k}</div>
                </div>
              ))}
            </div>

            {/* Log button */}
            <button className="btn-primary w-full" onClick={logMeal} disabled={saving}>
              {saving
                ? <><Loader2 size={14} className="inline animate-spin mr-2" />Saving...</>
                : `Log ${mealType} · ${cartTotals.calories} kcal`}
            </button>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          ENTRY TABS
          ══════════════════════════════════════════════ */}
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

        {/* ── MANUAL ──────────────────────────────────────── */}
        {mode === "manual" && (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Type any food name — AI estimates nutrition. Adjust values, then add to your cart.
            </p>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>
                Food name <span style={{ color: "var(--text-dim)" }}>(Filipino, English, or fast food)</span>
              </label>
              <input
                placeholder="e.g. Chicken Adobo, Jollibee Chickenjoy, Mang Inasal Paa..."
                value={manualFood}
                onChange={e => { setManualFood(e.target.value); setManualEstimate(null); setEstimateError(null); }}
                onKeyDown={e => e.key === "Enter" && estimateManual()}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Portion (optional)</label>
                <input placeholder="e.g. 1 cup, 200g, 1 piece" value={manualPortion} onChange={e => setManualPortion(e.target.value)} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Ingredients (optional)</label>
                <input placeholder="e.g. with potatoes, carrots" value={manualIngredients} onChange={e => setManualIngredients(e.target.value)} />
              </div>
            </div>

            {estimateError && <ErrorBanner message={estimateError} onDismiss={() => setEstimateError(null)} />}

            <button className="btn-ghost w-full flex items-center justify-center gap-2"
              onClick={estimateManual} disabled={estimating || !manualFood.trim()}>
              {estimating
                ? <><Loader2 size={14} className="animate-spin" />Estimating...</>
                : <><Sparkles size={14} />Estimate Nutrition with AI</>}
            </button>

            {manualEstimate && (
              <div className="rounded-xl p-3 space-y-2"
                style={{ background: "var(--bg-card2)", border: "1px solid var(--accent-dim)" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{manualEstimate.foodName}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{manualEstimate.portion}</div>
                  </div>
                  <div className="text-lg font-bold" style={{ color: "var(--accent)" }}>{manualEstimate.calories} kcal</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-center">
                  {[["Protein", manualEstimate.protein, "g"], ["Carbs", manualEstimate.carbs, "g"], ["Fat", manualEstimate.fat, "g"]].map(([k, v, u]) => (
                    <div key={k as string} className="py-1.5 rounded-lg" style={{ background: "var(--bg-card)" }}>
                      <div className="font-semibold">{v}{u}</div>
                      <div style={{ color: "var(--text-muted)" }}>{k}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs" style={{ color: "var(--text-dim)" }}>AI estimate · adjust values if needed</p>
                <div className="grid grid-cols-4 gap-1">
                  {(["calories", "protein", "carbs", "fat"] as const).map(k => (
                    <div key={k}>
                      <label className="text-xs block capitalize" style={{ color: "var(--text-muted)" }}>{k}</label>
                      <input type="number" value={manualEstimate[k]}
                        onChange={e => setManualEstimate(prev => prev ? { ...prev, [k]: +e.target.value } : prev)}
                        className="text-xs text-center" />
                    </div>
                  ))}
                </div>
                <button className="btn-primary w-full flex items-center justify-center gap-2" onClick={addManualToCart}>
                  <Plus size={14} /> Add to Cart
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── PRODUCT ─────────────────────────────────────── */}
        {mode === "product" && (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Search PH fast food, local grocery brands (Lucky Me, Mega Sardines…), and packaged food.
            </p>
            <div className="relative">
              <input
                placeholder="e.g. Chickenjoy, Lucky Me Pancit Canton, Mega Sardines, Big Mac..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSelectedProduct(null); }}
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 size={14} className="animate-spin" style={{ color: "var(--accent)" }} />
                </div>
              )}
            </div>

            {searchResults.length > 0 && !selectedProduct && (
              <div className="rounded-xl border overflow-hidden"
                style={{ borderColor: "var(--border)", background: "var(--bg-card2)" }}>
                {searchResults.map(p => (
                  <button key={p.id}
                    onClick={() => { setSelectedProduct(p); setSearchQuery(p.name); setSearchResults([]); setServingQty(1); }}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/5 transition-colors border-b last:border-0"
                    style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{p.name}</span>
                      {p.perServing && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid var(--accent-dim)" }}>PH</span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {p.brand && `${p.brand} · `}
                      {p.calories} kcal{p.perServing ? "/serving" : "/100g"}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQuery.length > 2 && !searching && !selectedProduct && (
              <div className="text-xs rounded-xl p-3" style={{ background: "var(--bg-card2)", color: "var(--text-muted)" }}>
                Not found — try the Manual tab and use AI estimation instead.
              </div>
            )}

            {selectedProduct && (
              <div className="space-y-3">
                <div className="rounded-xl p-3" style={{ background: "var(--bg-card2)", border: "1px solid var(--accent-dim)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-medium text-sm" style={{ color: "var(--accent)" }}>{selectedProduct.name}</div>
                    {selectedProduct.perServing && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid var(--accent-dim)" }}>PH</span>
                    )}
                  </div>
                  {selectedProduct.brand && (
                    <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{selectedProduct.brand}</div>
                  )}
                  <div className="grid grid-cols-4 gap-2 text-xs text-center">
                    {(["calories", "protein", "carbs", "fat"] as const).map(k => {
                      const ratio = selectedProduct.perServing ? servingQty : servingQty / 100;
                      return (
                        <div key={k} className="py-1.5 rounded-lg" style={{ background: "var(--bg-card)" }}>
                          <div className="font-semibold">{Math.round((selectedProduct[k] ?? 0) * ratio)}</div>
                          <div style={{ color: "var(--text-muted)" }} className="capitalize">
                            {k === "calories" ? "kcal" : k + "g"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>
                    {selectedProduct.perServing ? "Number of servings" : "Amount (grams)"}
                  </label>
                  <input
                    type="number"
                    value={servingQty}
                    min={selectedProduct.perServing ? 0.5 : 1}
                    step={selectedProduct.perServing ? 0.5 : 10}
                    onChange={e => setServingQty(+e.target.value)}
                  />
                </div>
                <button className="btn-primary w-full flex items-center justify-center gap-2" onClick={addProductToCart}>
                  <Plus size={14} /> Add to Cart
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── IMAGE AI ────────────────────────────────────── */}
        {mode === "image" && (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Photo your meal — AI detects each item separately so you can choose what to add to your cart.
            </p>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-8 cursor-pointer transition-colors"
              style={{ borderColor: imagePreview ? "var(--accent-dim)" : "var(--border)" }}>
              {imagePreview
                ? <img src={imagePreview} alt="food" className="max-h-48 rounded-lg object-contain" />
                : <>
                  <Camera size={28} style={{ color: "var(--text-dim)" }} />
                  <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>Tap to upload food photo</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>Detects multiple items at once</p>
                </>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment"
              className="hidden" onChange={handleImageChange} />
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>
                Describe your meal (optional — helps accuracy)
              </label>
              <input
                placeholder="e.g. Jollibee meal with Chickenjoy, java rice, and Coke"
                value={imageDescription}
                onChange={e => setImageDescription(e.target.value)}
              />
            </div>

            {analyzeError && <ErrorBanner message={analyzeError} onDismiss={() => setAnalyzeError(null)} />}

            <button className="btn-ghost w-full flex items-center justify-center gap-2"
              onClick={analyzeImage} disabled={analyzing || (!imageBase64 && !imageDescription)}>
              {analyzing
                ? <><Loader2 size={14} className="animate-spin" />Analyzing...</>
                : <><Sparkles size={14} />Analyze with AI Vision</>}
            </button>

            {imageItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                  <span>Detected {imageItems.length} item{imageItems.length > 1 ? "s" : ""} — tap to select</span>
                  <span style={{ color: "var(--accent)" }}>
                    {imageItems.filter((_, i) => selectedImageItems.has(i)).reduce((s, i) => s + i.calories, 0)} kcal selected
                  </span>
                </div>
                {imageItems.map((item, idx) => {
                  const selected = selectedImageItems.has(idx);
                  return (
                    <div key={idx} onClick={() => toggleImageItem(idx)}
                      className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all"
                      style={{
                        background: selected ? "var(--accent-glow)" : "var(--bg-card2)",
                        border: `1px solid ${selected ? "var(--accent-dim)" : "var(--border)"}`,
                      }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: selected ? "var(--accent)" : "var(--border)" }}>
                        {selected && <Check size={12} className="text-black" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {item.portion} · P:{item.protein}g C:{item.carbs}g F:{item.fat}g
                        </div>
                      </div>
                      <div className="font-bold text-sm" style={{ color: "var(--accent)" }}>{item.calories} kcal</div>
                    </div>
                  );
                })}
                <button className="btn-primary w-full flex items-center justify-center gap-2"
                  onClick={addImageItemsToCart} disabled={selectedImageItems.size === 0}>
                  <Plus size={14} /> Add {selectedImageItems.size} item{selectedImageItems.size !== 1 ? "s" : ""} to Cart
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          TODAY'S LOG
          ══════════════════════════════════════════════ */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Today's Log</h3>
          <span className="text-sm font-medium" style={{ color: "var(--accent)" }}>{totalCalories} kcal total</span>
        </div>
        {meals.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: "var(--text-dim)" }}>No meals logged today</p>
        ) : (
          <div className="space-y-4">
            {mealsByType.map(group => (
              <div key={group.type}>
                <button onClick={() => toggleGroup(group.type)}
                  className="w-full flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold capitalize px-2 py-0.5 rounded-full"
                    style={{ background: "var(--bg-card2)", color: "var(--accent)", border: "1px solid var(--accent-dim)" }}>
                    {group.type}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{group.total} kcal</span>
                    {collapsedGroups.has(group.type)
                      ? <ChevronDown size={13} style={{ color: "var(--text-muted)" }} />
                      : <ChevronUp size={13} style={{ color: "var(--text-muted)" }} />}
                  </div>
                </button>
                {!collapsedGroups.has(group.type) && group.items.map(m => (
                  <div key={m.id}
                    className="flex items-center justify-between text-sm py-2 pl-2 border-b group cursor-pointer rounded-lg transition-colors hover:bg-white/5"
                    style={{ borderColor: "var(--border)" }}
                    onClick={() => setSelectedMeal(m)}>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{m.foodName}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {m.protein ? `P:${m.protein}g` : ""}
                        {m.carbs ? ` C:${m.carbs}g` : ""}
                        {m.fat ? ` F:${m.fat}g` : ""}
                        {!m.protein && !m.carbs && !m.fat ? "Tap for details" : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span style={{ color: "var(--accent)" }}>{m.calories} kcal</span>
                      <button
                        onClick={e => { e.stopPropagation(); deleteMeal(m.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: "var(--danger)" }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}