'use client'

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { formatCompactMoney, formatMoney } from '@/lib/format'

const financeConfig = {
  recettes: { label: 'Recettes', color: 'var(--chart-2)' },
  depenses: { label: 'Dépenses', color: 'var(--chart-1)' },
} satisfies ChartConfig

export function FinanceChart({ data, currency }: { data: Array<{ month: string; recettes: number; depenses: number }>; currency: string }) {
  return (
    <ChartContainer config={financeConfig} className="aspect-auto h-72 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="fillRecettes" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-recettes)" stopOpacity={0.45} />
            <stop offset="95%" stopColor="var(--color-recettes)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="fillDepenses" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-depenses)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-depenses)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={72} tickFormatter={(v) => formatCompactMoney(Number(v), currency)} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v, name) => (
          <div className="flex w-full items-center justify-between gap-4">
            <span className="text-muted-foreground">{financeConfig[name as keyof typeof financeConfig]?.label}</span>
            <span className="font-mono font-medium tabular-nums">{formatMoney(Number(v), currency)}</span>
          </div>
        )} />} />
        <Area dataKey="depenses" type="monotone" stroke="var(--color-depenses)" fill="url(#fillDepenses)" strokeWidth={2} />
        <Area dataKey="recettes" type="monotone" stroke="var(--color-recettes)" fill="url(#fillRecettes)" strokeWidth={2.5} />
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  )
}

const levelConfig = {
  garcons: { label: 'Garçons', color: 'var(--chart-1)' },
  filles: { label: 'Filles', color: 'var(--chart-2)' },
} satisfies ChartConfig

export function LevelChart({ data }: { data: Array<{ level: string; garcons: number; filles: number }> }) {
  return (
    <ChartContainer config={levelConfig} className="aspect-auto h-64 w-full">
      <BarChart data={data} margin={{ left: -16, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="level" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="garcons" stackId="a" fill="var(--color-garcons)" radius={[0, 0, 4, 4]} />
        <Bar dataKey="filles" stackId="a" fill="var(--color-filles)" radius={[4, 4, 0, 0]} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  )
}

const attendanceConfig = { taux: { label: 'Taux de présence', color: 'var(--chart-1)' } } satisfies ChartConfig

export function AttendanceChart({ data }: { data: Array<{ day: string; taux: number }> }) {
  return (
    <ChartContainer config={attendanceConfig} className="aspect-auto h-56 w-full">
      <LineChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis domain={[70, 100]} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => <span className="font-mono font-medium">{Number(v).toFixed(1)} %</span>} />} />
        <Line dataKey="taux" type="monotone" stroke="var(--color-taux)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--chart-2)', strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ChartContainer>
  )
}

export function DonutChart({ data, config, centerLabel, centerValue }: { data: Array<{ name: string; value: number; fill: string }>; config: ChartConfig; centerLabel: string; centerValue: string }) {
  return (
    <div className="relative">
      <ChartContainer config={config} className="mx-auto aspect-square h-52">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={3} strokeWidth={0}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-2xl font-semibold">{centerValue}</span>
        <span className="text-xs text-muted-foreground">{centerLabel}</span>
      </div>
    </div>
  )
}
