"use client";

import { memo } from "react";
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { DailyStudyData } from "@/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function CustomTooltip({
  active, payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DailyStudyData }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0d0d14]/95 px-2.5 py-1.5 text-xs shadow-xl">
      <p className="text-white/50">{d.label}</p>
      <p className="font-semibold text-white">{d.hours > 0 ? `${d.hours}h` : "–"}</p>
    </div>
  );
}

export const MiniWeeklyChart = memo(function MiniWeeklyChart({ data }: { data: DailyStudyData[] }) {
  const todayStr = localDateStr(new Date());

  return (
    <ResponsiveContainer width="100%" height={72}>
      <BarChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }} barCategoryGap="25%">
        <XAxis
          dataKey="date"
          tickFormatter={(v: string) => {
            const [y, m, d] = v.split("-").map(Number);
            return DAY_LABELS[new Date(y, m - 1, d).getDay()];
          }}
          tick={{ fill: "#ffffff35", fontSize: 9 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Bar dataKey="hours" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={
                entry.date === todayStr
                  ? "#6366f1"
                  : entry.minutes > 0
                  ? "#6366f180"
                  : "#ffffff0d"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
});
