"use client";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { platformColor } from "@/lib/platforms";

export type PlatformSeriesRow = {
  date: string;
  meta: number;
  google: number;
  tiktok: number;
};

export function PerformanceChart({ data }: { data: PlatformSeriesRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ left: -10, right: 8, top: 10, bottom: 0 }}>
        <defs>
          {(["meta", "google", "tiktok"] as const).map((p) => (
            <linearGradient key={p} id={`fill-${p}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={platformColor(p)} stopOpacity={0.35} />
              <stop offset="100%" stopColor={platformColor(p)} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="0" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v) => `${v.toFixed(1)}×`}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--surface-1))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
            padding: "8px 12px",
            color: "hsl(var(--foreground))",
          }}
          labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 11, marginBottom: 4 }}
          itemStyle={{ color: "hsl(var(--foreground))" }}
          cursor={{ stroke: "hsl(var(--border-strong))", strokeWidth: 1 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          iconType="circle"
          iconSize={6}
          formatter={(v) => <span style={{ color: "hsl(var(--muted-foreground))", textTransform: "capitalize" }}>{v}</span>}
        />
        <Area
          type="monotone"
          dataKey="meta"
          stroke={platformColor("meta")}
          strokeWidth={1.5}
          fill="url(#fill-meta)"
        />
        <Area
          type="monotone"
          dataKey="google"
          stroke={platformColor("google")}
          strokeWidth={1.5}
          fill="url(#fill-google)"
        />
        <Area
          type="monotone"
          dataKey="tiktok"
          stroke={platformColor("tiktok")}
          strokeWidth={1.5}
          fill="url(#fill-tiktok)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
