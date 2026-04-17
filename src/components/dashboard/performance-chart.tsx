"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Row = { date: string; roas: number; spend: number };

export function PerformanceChart({ data }: { data: Row[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="roas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2FCBB3" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#2FCBB3" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="spend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5DDECA" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#5DDECA" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(201,210,214,0.06)" strokeDasharray="3 3" />
        <XAxis dataKey="date" stroke="rgba(155,169,175,0.6)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis yAxisId="left" stroke="rgba(155,169,175,0.6)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis yAxisId="right" orientation="right" stroke="rgba(155,169,175,0.6)" fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: "rgba(8,12,14,0.92)",
            border: "1px solid rgba(47,203,179,0.2)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#9BA9AF" }}
          itemStyle={{ color: "#E6FBF8" }}
        />
        <Area yAxisId="left" type="monotone" dataKey="roas" stroke="#2FCBB3" strokeWidth={2} fill="url(#roas)" />
        <Area yAxisId="right" type="monotone" dataKey="spend" stroke="#5DDECA" strokeWidth={1.5} fill="url(#spend)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
