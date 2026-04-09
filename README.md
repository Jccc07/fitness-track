# 🏃 VitalTrack — Health & Fitness Tracker

A clean, mobile-responsive health and fitness tracker built with Next.js 14 (App Router), TypeScript, Tailwind CSS, Prisma + SQLite.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Health Profile** | BMI, BMR, TDEE, target calories via Mifflin-St Jeor |
| **Food Logging (3 modes)** | Manual entry, Open Food Facts product search, AI image estimate |
| **Activity Logging (2 modes)** | Manual (MET formula), Strava screenshot OCR |
| **Weekly Insights** | Charts, macro breakdown, rule-based suggestions |
| **Daily Conclusion** | Conversational feedback, health insight, tomorrow's advice |
| **Dashboard** | Calorie ring, stat cards, today's log, 7-day chart |
| **Weight Tracking** | Progress chart over time |

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd fitness-tracker
npm install
```

### 2. Set up environment

```bash
cp .env.local .env
# .env already has DATABASE_URL="file:./dev.db"
```

### 3. Set up database

```bash
npm run db:push
```

### 4. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

### 5. First-time setup

1. Go to **Profile** → fill in age, sex, height, weight, activity level, goal → Save
2. Return to **Dashboard** — your calorie target is now set
3. Start logging meals and activities!

---

## 📁 Project Structure

```
fitness-tracker/
├── prisma/
│   └── schema.prisma          # DB models: Profile, Meals, Activities, WeightLog
├── src/
│   ├── app/
│   │   ├── page.tsx           # Dashboard
│   │   ├── layout.tsx         # Root layout + Nav
│   │   ├── globals.css        # Design system (CSS vars, fonts, utilities)
│   │   ├── profile/
│   │   │   └── page.tsx       # Profile form + metrics + weight chart
│   │   ├── log/
│   │   │   ├── page.tsx       # Food logging (manual / product / image)
│   │   │   └── activity/
│   │   │       └── page.tsx   # Activity logging (manual / screenshot OCR)
│   │   ├── insights/
│   │   │   └── page.tsx       # Weekly insights + daily conclusion
│   │   └── api/
│   │       ├── profile/
│   │       │   ├── route.ts   # GET/POST user profile
│   │       │   └── weight/route.ts
│   │       ├── meals/
│   │       │   ├── route.ts   # GET/POST meals by date
│   │       │   ├── [id]/route.ts  # PUT/DELETE meal
│   │       │   ├── search/route.ts    # Open Food Facts search
│   │       │   └── analyze-image/route.ts  # AI calorie estimate
│   │       ├── activities/
│   │       │   ├── route.ts   # GET/POST activities by date
│   │       │   └── [id]/route.ts  # PUT/DELETE activity
│   │       └── insights/route.ts  # Weekly summary + daily conclusion
│   ├── components/
│   │   ├── layout/Nav.tsx     # Sidebar (desktop) + bottom nav (mobile)
│   │   ├── charts/
│   │   │   ├── CalorieRing.tsx   # SVG donut progress ring
│   │   │   ├── WeeklyChart.tsx   # Recharts bar+line chart
│   │   │   ├── MacroChart.tsx    # Recharts pie chart
│   │   │   └── WeightChart.tsx   # Recharts line chart
│   │   └── ui/
│   │       ├── DailyConclusion.tsx  # Conversational daily summary card
│   │       └── StatCard.tsx         # Metric display card
│   ├── lib/
│   │   ├── calculations.ts    # BMR, BMI, TDEE, MET, conclusions (pure functions)
│   │   ├── prisma.ts          # Prisma client singleton
│   │   └── api.ts             # Open Food Facts helpers + food calorie table
│   └── types/index.ts         # All TypeScript interfaces
```

---

## 🧮 Calculations Reference

### BMR (Mifflin-St Jeor)
```
Male:   BMR = (10 × weight_kg) + (6.25 × height_cm) − (5 × age) + 5
Female: BMR = (10 × weight_kg) + (6.25 × height_cm) − (5 × age) − 161
```

### TDEE
```
Sedentary:  TDEE = BMR × 1.2
Moderate:   TDEE = BMR × 1.55
Active:     TDEE = BMR × 1.725
```

### Target Calories
```
Maintain: target = TDEE
Deficit:  target = TDEE − 500 kcal
Bulk:     target = TDEE + 300 kcal
```

### Activity Calories (MET Formula)
```
Calories = MET × weight_kg × duration_hours
```

| Activity | MET |
|---|---|
| Walking | 3.5 |
| Running | 9.8 |
| Cycling | 7.5 |
| Swimming | 8.0 |
| Weight training | 5.0 |
| Yoga | 2.5 |
| HIIT | 10.0 |

---

## 🌐 External APIs Used

| API | Usage | Auth |
|---|---|---|
| [Open Food Facts](https://world.openfoodfacts.org/) | Product search by name/brand | None (free) |
| Tesseract.js | OCR on activity screenshots | None (runs in browser) |

---

## 🚢 Deploying to Vercel

### Important: SQLite on Vercel

SQLite doesn't persist between Vercel function invocations. For production, switch to **Turso** (SQLite-compatible, free tier) or **PlanetScale/Supabase (PostgreSQL)**.

### Option A: Turso (Recommended for SQLite parity)

```bash
npm install @libsql/client @prisma/adapter-libsql
```

Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("TURSO_DATABASE_URL")
  // add: relationMode = "prisma"
}
```

Add to `.env`:
```
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token
```

### Option B: Keep SQLite (local/demo only)

Add to `vercel.json`:
```json
{
  "functions": {
    "src/app/api/**": {
      "maxDuration": 10
    }
  }
}
```

### Deploy steps

```bash
npm install -g vercel
vercel login
vercel --prod
# Add env vars in Vercel dashboard
```

---

## 🔧 Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | SQLite path or Turso URL | `file:./dev.db` |

---

## 🛣 Extending the App

### Add authentication
→ Drop in [NextAuth.js](https://next-auth.js.org/) or [Clerk](https://clerk.com/), replace `"default"` profile ID with user ID

### Real AI food recognition
→ Replace `analyze-image` route with OpenAI Vision API call:
```ts
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: [
    { type: "image_url", image_url: { url: base64Image } },
    { type: "text", text: "Estimate the calories and macros in this meal." }
  ]}]
});
```

### Barcode scanning
→ Use `react-zxing` or `html5-qrcode` + pass barcode to Open Food Facts `/api/v0/product/{barcode}.json`

### Push notifications
→ Add `web-push` package + service worker for daily logging reminders

---

## 📱 Mobile

The app is fully responsive with:
- Sidebar nav on desktop (md+)
- Fixed bottom nav bar on mobile
- Touch-friendly tap targets
- Compact card layouts on small screens

---

## License

MIT# fitness-track
