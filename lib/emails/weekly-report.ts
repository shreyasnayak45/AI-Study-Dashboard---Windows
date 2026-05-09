/**
 * StudyFlow — Weekly Report HTML email template.
 *
 * Design goals:
 *   • Dark-themed, premium — "Spotify Wrapped for studying"
 *   • Screenshot-worthy stats layout
 *   • Mobile-friendly (scales within max-width:600px)
 *   • All styles inline — email clients strip <style> blocks
 *   • Table-based layout for cross-client compatibility
 *
 * Sections:
 *   1. Brand bar + header (logo, week range)
 *   2. Hero — big hours number + week-over-week delta
 *   3. Stat grid — active days / sessions / avg session / streak
 *   4. Subject breakdown — colored percentage bars
 *   5. Daily activity — 7-day bar chart
 *   6. Best day callout (conditional)
 *   7. Best focus window (conditional — only when hasTimingData)
 *   8. AI section — headline / narrative / insight / recommendation
 *   9. Next week target
 *  10. Footer
 */

import { fmtHours } from "@/lib/analytics-utils";
import type { WeeklyReport, WeeklySubject, WeeklyDayStats } from "@/lib/weekly-report/types";

// ─── Palette ──────────────────────────────────────────────────────────────────
// All solid colours — rgba values are unreliable in Outlook.

const C = {
  bgOuter:   "#09090c",
  bgCard:    "#101015",
  bgInner:   "#141419",
  bgDark:    "#0c0c10",
  border:    "#21212a",
  borderLt:  "#2a2a35",
  brand:     "#6366f1",
  brandLt:   "#818cf8",
  brandBg:   "#1a1a3a",
  brandBorder:"#2d2d5a",
  text:      "#f0f0f3",
  text2:     "#a0a0aa",
  text3:     "#606068",
  text4:     "#3a3a44",
  green:     "#22c55e",
  greenBg:   "#14301e",
  greenBorder:"#1e4d2b",
  red:       "#f87171",
  redBg:     "#2d1515",
  redBorder: "#4d2020",
  orange:    "#fb923c",
  violet:    "#a78bfa",
} as const;

// Subject bar colours cycle through these (matches CHART_COLORS in analytics-utils).
const SUBJECT_COLORS = [
  "#6366f1", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444",
] as const;

// Focus-window display labels.
const FOCUS_LABELS: Record<string, string> = {
  "pre-dawn":      "Pre-Dawn  ·  12am – 5am UTC",
  "early-morning": "Early Morning  ·  5am – 8am UTC",
  "morning":       "Morning  ·  8am – 12pm UTC",
  "afternoon":     "Afternoon  ·  12pm – 5pm UTC",
  "evening":       "Evening  ·  5pm – 9pm UTC",
  "night":         "Night  ·  9pm – 12am UTC",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;");
}

function heroHours(minutes: number): string {
  if (minutes < 60) return `${minutes}`;
  const h = minutes / 60;
  return h % 1 === 0 ? `${h}` : `${h.toFixed(1)}`;
}

function heroUnit(minutes: number): string {
  return minutes < 60 ? "minutes studied this week" : "hours studied this week";
}

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const parse  = (s: string) => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
  const fmt    = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString("en-US", opts);
  const start  = parse(weekStart);
  const end    = parse(weekEnd);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    return `${fmt(start, { month: "long" })} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${fmt(start, { month: "short", day: "numeric" })} – ${fmt(end, { month: "short", day: "numeric" })}, ${end.getFullYear()}`;
}

function sectionLabel(text: string): string {
  return `<p style="margin:0 0 16px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${C.text3}">${text}</p>`;
}

function divider(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:1px;background:${C.border};font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

// ─── Section renderers ────────────────────────────────────────────────────────

function renderHeader(weekStart: string, weekEnd: string): string {
  const range = esc(formatWeekRange(weekStart, weekEnd));
  return `
<tr>
  <td style="padding:28px 36px 24px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:middle">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;padding-right:10px">
                <div style="width:34px;height:34px;background:${C.brand};border-radius:9px;text-align:center;line-height:34px;font-size:17px">📚</div>
              </td>
              <td style="vertical-align:middle">
                <p style="margin:0;font-size:15px;font-weight:700;color:${C.text};letter-spacing:-0.2px">StudyFlow</p>
                <p style="margin:1px 0 0;font-size:11px;color:${C.text3};letter-spacing:0.4px">AI Study Dashboard</p>
              </td>
            </tr>
          </table>
        </td>
        <td style="text-align:right;vertical-align:middle">
          <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:${C.text3}">Weekly Report</p>
          <p style="margin:3px 0 0;font-size:12px;color:${C.text3}">${range}</p>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

function renderHero(report: WeeklyReport): string {
  const { totalMinutes, weekOverWeekPct, prevWeekMinutes, activeDays } = report.stats;

  let deltaHtml = "";
  if (weekOverWeekPct === null) {
    deltaHtml = `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px auto 0">
        <tr><td style="background:${C.bgInner};border:1px solid ${C.border};border-radius:20px;padding:5px 14px">
          <span style="font-size:12px;color:${C.text3}">First week tracked</span>
        </td></tr>
      </table>`;
  } else if (weekOverWeekPct === 0) {
    deltaHtml = `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px auto 0">
        <tr><td style="background:${C.bgInner};border:1px solid ${C.border};border-radius:20px;padding:5px 14px">
          <span style="font-size:12px;color:${C.text3}">Same as last week</span>
        </td></tr>
      </table>`;
  } else if (weekOverWeekPct > 0) {
    const prevH = fmtHours(prevWeekMinutes);
    deltaHtml = `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px auto 0">
        <tr><td style="background:${C.greenBg};border:1px solid ${C.greenBorder};border-radius:20px;padding:5px 16px">
          <span style="font-size:12px;font-weight:700;color:${C.green}">&#8593; ${weekOverWeekPct}% from last week &nbsp;<span style="font-weight:400;color:#4ade80;opacity:0.7">(${prevH})</span></span>
        </td></tr>
      </table>`;
  } else {
    const prevH = fmtHours(prevWeekMinutes);
    deltaHtml = `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px auto 0">
        <tr><td style="background:${C.redBg};border:1px solid ${C.redBorder};border-radius:20px;padding:5px 16px">
          <span style="font-size:12px;font-weight:700;color:${C.red}">&#8595; ${Math.abs(weekOverWeekPct!)}% from last week &nbsp;<span style="font-weight:400;opacity:0.7">(${prevH})</span></span>
        </td></tr>
      </table>`;
  }

  const activeDaysBar = Array.from({ length: 7 }, (_, i) => {
    const filled = i < activeDays;
    return `<td style="padding:0 2px"><div style="width:20px;height:5px;border-radius:3px;background:${filled ? C.brand : C.border}"></div></td>`;
  }).join("");

  return `
<tr>
  <td style="padding:32px 36px;text-align:center;border-bottom:1px solid ${C.border}">
    <p style="margin:0;font-size:64px;font-weight:800;color:${C.text};line-height:1;letter-spacing:-3px">${heroHours(totalMinutes)}</p>
    <p style="margin:8px 0 0;font-size:13px;color:${C.text2};letter-spacing:0.3px">${heroUnit(totalMinutes)}</p>
    ${deltaHtml}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px auto 0">
      <tr>
        <td style="padding-right:8px;vertical-align:middle">
          <span style="font-size:11px;color:${C.text3}">Active days</span>
        </td>
        ${activeDaysBar}
        <td style="padding-left:8px;vertical-align:middle">
          <span style="font-size:11px;font-weight:700;color:${C.text2}">${activeDays}/7</span>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

function renderStatGrid(report: WeeklyReport): string {
  const { avgSessionMinutes, sessionCount, longestSessionMinutes, currentStreak } = report.stats;

  const cell = (value: string, label: string, borderRight = true) => `
    <td style="text-align:center;padding:18px 8px${borderRight ? ";border-right:1px solid " + C.border : ""}">
      <p style="margin:0;font-size:26px;font-weight:700;color:${C.text};letter-spacing:-1px">${value}</p>
      <p style="margin:5px 0 0;font-size:10px;font-weight:600;letter-spacing:0.6px;text-transform:uppercase;color:${C.text3}">${label}</p>
    </td>`;

  return `
<tr>
  <td style="background:${C.bgDark};border-bottom:1px solid ${C.border}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${cell(String(sessionCount), "Sessions")}
        ${cell(fmtHours(avgSessionMinutes), "Avg Session")}
        ${cell(fmtHours(longestSessionMinutes), "Best Session")}
        ${cell(currentStreak > 0 ? `${currentStreak}d` : "—", "Streak", false)}
      </tr>
    </table>
  </td>
</tr>`;
}

function renderSubjects(subjects: WeeklySubject[]): string {
  if (subjects.length === 0) {
    return `<p style="margin:0;font-size:13px;color:${C.text3}">No subjects logged this week.</p>`;
  }

  const rows = subjects.map((s, i) => {
    const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
    const pct   = Math.max(2, s.percentage); // min 2% so zero-sessions show a stub
    const rest  = 100 - pct;
    const time  = fmtHours(s.minutes);

    return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px">
  <tr>
    <td style="width:120px;padding-bottom:6px;vertical-align:middle">
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-right:8px;vertical-align:middle">
            <div style="width:3px;height:14px;background:${color};border-radius:2px"></div>
          </td>
          <td style="vertical-align:middle">
            <span style="font-size:13px;color:${C.text2}">${esc(s.name)}</span>
          </td>
        </tr>
      </table>
    </td>
    <td style="padding:0 14px 6px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:${pct}%;background:${color};height:6px;border-radius:3px 0 0 3px"></td>
          <td style="width:${rest}%;background:${C.border};height:6px;border-radius:0 3px 3px 0"></td>
        </tr>
      </table>
    </td>
    <td style="width:56px;text-align:right;padding-bottom:6px;vertical-align:middle">
      <span style="font-size:12px;color:${C.text3}">${time}</span>
    </td>
  </tr>
</table>`;
  }).join("");

  return rows;
}

function renderDailyActivity(daily: WeeklyDayStats[]): string {
  const maxMins = Math.max(...daily.map((d) => d.minutes), 1);
  const BAR_MAX = 48;
  const BAR_MIN = 4;

  const bars = daily.map((day) => {
    const h = day.minutes === 0
      ? BAR_MIN
      : Math.max(BAR_MIN, Math.round((day.minutes / maxMins) * BAR_MAX));
    const color   = day.minutes > 0 ? C.brand : C.border;
    const topPad  = BAR_MAX - h;

    return `
<td style="text-align:center;vertical-align:bottom;width:14%;padding:0 3px">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;height:${BAR_MAX}px">
    <tr><td style="height:${topPad}px;line-height:${topPad}px;font-size:0">&nbsp;</td></tr>
    <tr><td style="height:${h}px">
      <div style="margin:0 auto;width:20px;height:${h}px;background:${color};border-radius:3px 3px 0 0"></div>
    </td></tr>
  </table>
  <p style="margin:5px 0 0;font-size:10px;color:${C.text3}">${day.dayName}</p>
  ${day.minutes > 0
    ? `<p style="margin:2px 0 0;font-size:10px;font-weight:600;color:${C.text2}">${fmtHours(day.minutes)}</p>`
    : `<p style="margin:2px 0 0;font-size:10px;color:${C.text4}">—</p>`}
</td>`;
  }).join("");

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr>${bars}</tr>
</table>`;
}

function renderBestDay(report: WeeklyReport): string {
  const { bestDay } = report.stats;
  if (!bestDay || bestDay.minutes < 30) return "";

  return `
<tr>
  <td style="padding:24px 36px 24px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:${C.bgInner};border:1px solid ${C.border};border-left:3px solid ${C.orange};border-radius:8px;padding:14px 18px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${C.text3}">Best Day</p>
                <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:${C.text}">${bestDay.dayName}</p>
              </td>
              <td style="text-align:right">
                <p style="margin:0;font-size:28px;font-weight:800;color:${C.orange};letter-spacing:-1px">${fmtHours(bestDay.minutes)}</p>
                <p style="margin:2px 0 0;font-size:11px;color:${C.text3}">in one day</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

function renderFocusWindow(report: WeeklyReport): string {
  const { hasTimingData, bestFocusWindow } = report.stats;
  if (!hasTimingData || !bestFocusWindow) return "";

  const label = FOCUS_LABELS[bestFocusWindow] ?? bestFocusWindow;

  return `
<tr>
  <td style="padding:0 36px 24px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:${C.bgInner};border:1px solid ${C.border};border-left:3px solid ${C.violet};border-radius:8px;padding:14px 18px">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${C.text3}">Best Focus Window</p>
          <p style="margin:6px 0 0;font-size:15px;font-weight:600;color:${C.violet}">${esc(label)}</p>
          <p style="margin:4px 0 0;font-size:12px;color:${C.text3}">Based on session start times · All times UTC</p>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

function renderAISection(report: WeeklyReport): string {
  const { ai } = report;

  return `
<tr>
  <td style="background:${C.bgDark};border-top:1px solid ${C.border};border-bottom:1px solid ${C.border}">
    <!-- AI section label -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:24px 36px 0;text-align:center">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${C.text3}">&#10022; Your Week, by AI</p>
        </td>
      </tr>
    </table>

    <!-- Headline -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:16px 36px 0;text-align:center">
          <p style="margin:0;font-size:26px;font-weight:800;color:${C.text};line-height:1.25;letter-spacing:-0.5px">${esc(ai.headline)}</p>
        </td>
      </tr>
    </table>

    <!-- Narrative -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:16px 36px 0">
          <p style="margin:0;font-size:15px;line-height:1.8;color:${C.text2}">${esc(ai.narrative)}</p>
        </td>
      </tr>
    </table>

    <!-- Insight box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:16px 36px 0">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:${C.bgCard};border:1px solid ${C.border};border-radius:8px;padding:14px 18px">
                <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.text3}">Pattern Insight</p>
                <p style="margin:0;font-size:14px;line-height:1.7;color:${C.text2}">${esc(ai.insight)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Recommendation -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:12px 36px 0">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:${C.brandBg};border:1px solid ${C.brandBorder};border-left:3px solid ${C.brand};border-radius:8px;padding:14px 18px">
                <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.brandLt}">For Next Week</p>
                <p style="margin:0;font-size:14px;line-height:1.7;color:${C.text2}">${esc(ai.recommendation)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Motivational ending -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:16px 36px 28px;text-align:center">
          <p style="margin:0;font-size:14px;line-height:1.8;color:${C.text3};font-style:italic">${esc(ai.motivationalEnding)}</p>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

function renderNextWeekTarget(report: WeeklyReport): string {
  const { ai } = report;

  return `
<tr>
  <td style="padding:24px 36px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:${C.bgInner};border:1px solid ${C.border};border-radius:10px;padding:18px 22px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;padding-right:16px">
                <div style="width:36px;height:36px;background:${C.bgDark};border:1px solid ${C.border};border-radius:9px;text-align:center;line-height:36px;font-size:17px">&#127919;</div>
              </td>
              <td style="vertical-align:middle">
                <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.text3}">Next Week Target</p>
                <p style="margin:5px 0 0;font-size:14px;font-weight:600;color:${C.text}">${esc(ai.nextWeekTarget)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

function renderFooter(): string {
  return `
<tr>
  <td style="padding:16px 36px 28px;border-top:1px solid ${C.border};text-align:center">
    <p style="margin:0;font-size:12px;color:${C.text4}">StudyFlow &nbsp;·&nbsp; AI Study Dashboard</p>
    <p style="margin:6px 0 0;font-size:11px;color:${C.text4}">This is an automated weekly report. No action required.</p>
  </td>
</tr>`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildWeeklyReportHtml(report: WeeklyReport): string {
  const { stats } = report;

  return /* html */`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>StudyFlow Weekly Report</title>
</head>
<body style="margin:0;padding:0;background:${C.bgOuter};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bgOuter};padding:32px 16px">
    <tr>
      <td align="center">

        <!-- Main card -->
        <table role="presentation" width="100%" style="max-width:600px;background:${C.bgCard};border:1px solid ${C.border};border-radius:16px;overflow:hidden" cellpadding="0" cellspacing="0">

          <!-- Brand gradient bar -->
          <tr>
            <td style="background:linear-gradient(90deg,${C.brand} 0%,${C.brandLt} 100%);height:4px;font-size:0;line-height:0">&nbsp;</td>
          </tr>

          ${renderHeader(stats.weekStart, stats.weekEnd)}
          ${divider()}
          ${renderHero(report)}
          ${renderStatGrid(report)}

          <!-- ── Subjects ──────────────────────────────────────────── -->
          <tr>
            <td style="padding:24px 36px;border-bottom:1px solid ${C.border}">
              ${sectionLabel("Subject Breakdown")}
              ${renderSubjects(stats.subjects)}
            </td>
          </tr>

          <!-- ── Daily activity ────────────────────────────────────── -->
          <tr>
            <td style="padding:24px 36px;border-bottom:1px solid ${C.border}">
              ${sectionLabel("Daily Activity")}
              ${renderDailyActivity(stats.dailyBreakdown)}
            </td>
          </tr>

          <!-- ── Best day (conditional) ────────────────────────────── -->
          ${renderBestDay(report)}

          <!-- ── Focus window (conditional) ────────────────────────── -->
          ${renderFocusWindow(report)}

          <!-- ── AI section ─────────────────────────────────────────── -->
          ${renderAISection(report)}

          <!-- ── Next week target ──────────────────────────────────── -->
          ${renderNextWeekTarget(report)}

          <!-- ── Footer ────────────────────────────────────────────── -->
          ${renderFooter()}

        </table>
        <!-- /Main card -->

        <!-- Outer footer -->
        <table role="presentation" width="100%" style="max-width:600px;margin-top:20px" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align:center">
              <p style="margin:0;font-size:11px;color:#27272a">Generated ${new Date(report.generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
