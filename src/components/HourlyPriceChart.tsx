import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ReferenceLine } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { getPriceForHour, isPeakHour, type PeakHourConfig } from "@/lib/peak-hours";
import { Clock } from "lucide-react";

interface Props {
  config: PeakHourConfig;
}

export default function HourlyPriceChart({ config }: Props) {
  const currentHour = new Date().getHours();

  const data = useMemo(() => {
    return Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${h % 12 || 12}${h < 12 ? "a" : "p"}`,
      price: getPriceForHour(h, config),
      isPeak: isPeakHour(h, config),
      isCurrent: h === currentHour,
    }));
  }, [config, currentHour]);

  const chartConfig = {
    price: { label: "Price/hr", color: "hsl(var(--primary))" },
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        <h3 className="font-display font-semibold text-sm">Hourly Pricing</h3>
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground mb-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" /> Off-peak
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-destructive inline-block" /> Peak
        </span>
      </div>
      <ChartContainer config={chartConfig} className="h-[160px] w-full">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} className="stroke-border" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            className="text-[10px]"
            interval={1}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            className="text-[10px]"
            tickFormatter={(v) => `₹${v}`}
          />
          <ChartTooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-popover border rounded-md px-3 py-2 shadow-md text-xs">
                  <p className="font-semibold">{d.hour}:00 – {d.hour + 1}:00</p>
                  <p className="text-foreground">₹{d.price}/hr {d.isPeak ? "(peak)" : ""}</p>
                  {d.isCurrent && <p className="text-primary font-medium">← Current hour</p>}
                </div>
              );
            }}
          />
          <ReferenceLine x={data[currentHour]?.label} stroke="hsl(var(--primary))" strokeDasharray="3 3" strokeWidth={1.5} />
          <Bar dataKey="price" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.isPeak ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                opacity={entry.isCurrent ? 1 : 0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
