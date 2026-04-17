"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Row = { date: string; roas: number; spend: number };

export function PerformanceChart({ data }: { data: Row[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ left: -10, right: 8, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="roas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14B39B" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#14B39B" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="hsl(0 0% 15%)" strokeDasharray="0" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="hsl(240 3% 63%)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          yAxisId="left"
          stroke="hsl(240 3% 63%)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="hsl(240 3% 63%)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={50}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(0 0% 7%)",
            border: "1px solid hsl(0 0% 15%)",
            borderRadius: 6,
            fontSize: 12,
            padding: "8px 12px",
          }}
          labelStyle={{ color: "hsl(240 3% 63%)", fontSize: 11, marginBottom: 4 }}
          itemStyle={{ color: "hsl(0 0% 98%)" }}
          cursor={{ stroke: "hsl(0 0% 20%)", strokeWidth: 1 }}
        />
        <Area yAxisId="left" type="monotone" dataKey="roas" stroke="#14B39B" strokeWidth={1.5} fill="url(#roas)" />
        <Area yAxisId="right" type="monotone" dataKey="spend" stroke="hsl(240 3% 63%)" strokeWidth={1} fill="transparent" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
