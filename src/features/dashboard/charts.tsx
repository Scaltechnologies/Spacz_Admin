import { Bar, BarChart, Cell, Pie, PieChart, PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface Slice {
  key: string;
  label: string;
  value: number;
  color: string;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Slice }[] }) {
  if (!active || !payload?.length) return null;
  const s = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-pop">
      <div className="flex items-center gap-2">
        <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
        <span className="font-medium">{s.label}</span>
        <span className="ml-2 font-semibold tabular">{formatNumber(s.value)}</span>
      </div>
    </div>
  );
}

export function Legend({ data, total, className }: { data: Slice[]; total?: number; className?: string }) {
  return (
    <ul className={cn('space-y-2 text-[13px]', className)}>
      {data.map((d) => (
        <li key={d.key} className="flex items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-sm" style={{ background: d.color }} aria-hidden />
          <span className="flex-1 truncate text-muted-foreground">{d.label}</span>
          <span className="font-medium tabular">{formatNumber(d.value)}</span>
          {total ? <span className="w-12 text-right text-xs text-muted-foreground tabular">{((d.value / total) * 100).toFixed(0)}%</span> : null}
        </li>
      ))}
    </ul>
  );
}

export function DonutChart({ data, centerLabel, centerValue }: { data: Slice[]; centerLabel: string; centerValue: number }) {
  const nonZero = data.filter((d) => d.value > 0);
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={nonZero.length ? nonZero : [{ key: 'empty', label: 'None', value: 1, color: 'var(--muted)' }]}
            dataKey="value"
            nameKey="label"
            innerRadius="68%"
            outerRadius="100%"
            paddingAngle={nonZero.length > 1 ? 2 : 0}
            stroke="var(--card)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {(nonZero.length ? nonZero : [{ key: 'empty', color: 'var(--muted)' }]).map((d) => (
              <Cell key={d.key} fill={d.color} />
            ))}
          </Pie>
          {nonZero.length > 0 && <Tooltip content={<ChartTooltip />} />}
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular">{formatNumber(centerValue)}</span>
        <span className="text-xs text-muted-foreground">{centerLabel}</span>
      </div>
    </div>
  );
}

export function HorizontalBars({ data, height = 180 }: { data: Slice[]; height?: number }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap={10}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={92}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          />
          <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} content={<ChartTooltip />} />
          <Bar
            dataKey="value"
            radius={[0, 6, 6, 0]}
            isAnimationActive={false}
            label={{ position: 'right', fill: 'var(--foreground)', fontSize: 12, formatter: (v: number) => formatNumber(v) }}
          >
            {data.map((d) => (
              <Cell key={d.key} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RadialGauge({ percent, label, sub }: { percent: number; label: string; sub?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="78%" outerRadius="100%" data={[{ value: clamped }]} startAngle={90} endAngle={-270}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={12} fill="var(--accent)" background={{ fill: 'var(--muted)' }} isAnimationActive={false} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular">{label}</span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}
