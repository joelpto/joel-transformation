// ==========================================================================
// Rule-based insights generated only from actual logged data. No medical
// claims, no diagnosis — purely descriptive observations.
// ==========================================================================
import { weekSummary, trailingAvgWeight } from "./calculations.js";
import { todayStr, weekNumber } from "./dates.js";
import { PLAN } from "../data/planData.js";

export function generateInsights(settings, logsByDate) {
  const insights = [];
  const today = todayStr();
  const wk = weekNumber(settings.startDate, today);
  if (wk < 1) return insights;

  const thisWeek = weekSummary(settings.startDate, wk, logsByDate);
  const lastWeek = wk > 1 ? weekSummary(settings.startDate, wk - 1, logsByDate) : null;

  if (thisWeek.avgProtein !== null) {
    const target = PLAN.dailyTargets.protein;
    const within = thisWeek.avgProtein >= target.min && thisWeek.avgProtein <= target.max;
    insights.push({
      icon: "target",
      text: `Your average protein intake this week is ${thisWeek.avgProtein}g, ${
        within ? "within your target range" : thisWeek.avgProtein < target.min ? "a bit below your target range" : "a bit above your target range"
      }.`,
    });
  }

  const avgNow = trailingAvgWeight(logsByDate, today, 7);
  const avgWeekAgo = trailingAvgWeight(logsByDate, shiftBack(today, 7), 7);
  if (avgNow !== null && avgWeekAgo !== null) {
    const diff = Math.round((avgNow - avgWeekAgo) * 10) / 10;
    if (Math.abs(diff) >= 0.1) {
      insights.push({
        icon: "chart",
        text: `Your 7-day average weight is trending ${diff < 0 ? "down" : "up"} (${diff > 0 ? "+" : ""}${diff}kg) compared with a week ago.`,
      });
    } else {
      insights.push({ icon: "chart", text: "Your weight has been steady over the past week." });
    }
  }

  if (thisWeek.plannedTrainingDays > 0) {
    insights.push({
      icon: "dumbbell",
      text: `You completed ${thisWeek.gymSessions} of ${thisWeek.plannedTrainingDays} planned resistance sessions this week.`,
    });
  }

  if (lastWeek && lastWeek.avgSteps !== null && thisWeek.avgSteps !== null) {
    const diff = thisWeek.avgSteps - lastWeek.avgSteps;
    if (Math.abs(diff) > 200) {
      insights.push({
        icon: "footprints",
        text: `Your step average ${diff > 0 ? "increased" : "decreased"} by ${Math.abs(Math.round(diff))} steps/day vs last week.`,
      });
    }
  }

  if (thisWeek.cardioSessions !== null && thisWeek.plannedTrainingDays > 0) {
    insights.push({
      icon: "activity",
      text: `${thisWeek.cardioSessions} cardio session${thisWeek.cardioSessions === 1 ? "" : "s"} logged this week.`,
    });
  }

  return insights.slice(0, 5);
}

function shiftBack(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d - n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}
