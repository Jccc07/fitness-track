// src/app/api/insights/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prisma as db } from "@/lib/prisma";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
import {
  computeHealthMetrics,
  generateDailyConclusion,
  generateWeeklySuggestions,
} from "@/lib/calculations";
import type { DailyStats, MealLog, ActivityLog } from "@/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const today = dateStr ? new Date(dateStr) : new Date();

    const profile = await db.userProfile.findUnique({ where: { id: "default" } });
    if (!profile) return NextResponse.json({ error: "No profile found" }, { status: 404 });

    const metrics = computeHealthMetrics(profile as Parameters<typeof computeHealthMetrics>[0]);

    // Build 7-day stats
    const dailyStats: DailyStats[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(today, i);
      const meals = await prisma.mealLog.findMany({
        where: { date: { gte: startOfDay(day), lte: endOfDay(day) } },
      });
      const activities = await prisma.activityLog.findMany({
        where: { date: { gte: startOfDay(day), lte: endOfDay(day) } },
      });
      const caloriesConsumed = meals.reduce((s: number, m: { calories: number }) => s + m.calories, 0);
      const caloriesBurned = activities.reduce((s: number, a: { caloriesBurned: number }) => s + a.caloriesBurned, 0);
      dailyStats.push({
        date: format(day, "yyyy-MM-dd"),
        caloriesConsumed,
        caloriesBurned,
        netCalories: caloriesConsumed - caloriesBurned,
        targetCalories: metrics.targetCalories,
        meals: meals as unknown as MealLog[],
        activities: activities as unknown as ActivityLog[],
      });
    }

    const todayStats = dailyStats[dailyStats.length - 1];
    const dailyConclusion = generateDailyConclusion(todayStats);

    const daysWithData = dailyStats.filter((d) => d.caloriesConsumed > 0);
    const totalConsumed = daysWithData.reduce((s, d) => s + d.caloriesConsumed, 0);
    const totalBurned = daysWithData.reduce((s, d) => s + d.caloriesBurned, 0);
    const daysLogged = daysWithData.length;
    const avgConsumed = daysLogged ? Math.round(totalConsumed / daysLogged) : 0;
    const avgBurned = daysLogged ? Math.round(totalBurned / daysLogged) : 0;

    const suggestions = generateWeeklySuggestions(avgConsumed, avgBurned, metrics.targetCalories, daysLogged);

    return NextResponse.json({
      dailyConclusion,
      weeklySummary: {
        totalConsumed,
        totalBurned,
        avgDailyConsumed: avgConsumed,
        avgDailyBurned: avgBurned,
        daysLogged,
        dailyStats,
      },
      suggestions,
      metrics,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}