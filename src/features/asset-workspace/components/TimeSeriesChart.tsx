import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@cognite/aura/chart';
import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { mergeChartSeries } from '../time-series/chartData';
import { timeSeriesRefKey } from '../time-series/timeSeriesProperties';
import {
  formatChartTimestamp,
  formatTooltipTimestamp,
} from '../time-series/tooltipTimestamp';
import type { ChartDatapointSeries } from '../time-series/types';

const CHART_COLORS = [
  'var(--color-chart-fjord-color-1)',
  'var(--color-chart-fjord-color-2)',
  'var(--color-chart-fjord-color-3)',
  'var(--color-chart-fjord-color-4)',
  'var(--color-chart-fjord-color-5)',
] as const;

type TimeSeriesChartProps = {
  seriesList: ChartDatapointSeries[];
};

function chartDataKey(index: number): string {
  return `series${index}`;
}

function buildChartConfig(seriesList: ChartDatapointSeries[]): ChartConfig {
  const config: ChartConfig = {};
  seriesList.forEach((series, index) => {
    const key = chartDataKey(index);
    config[key] = {
      label: series.unit ? `${series.label} (${series.unit})` : series.label,
      color: CHART_COLORS[index % CHART_COLORS.length],
    };
  });
  return config;
}

export function TimeSeriesChart({ seriesList }: TimeSeriesChartProps) {
  const chartData = useMemo(
    () => mergeChartSeries(seriesList, (_series, index) => chartDataKey(index)),
    [seriesList],
  );
  const config = useMemo(() => buildChartConfig(seriesList), [seriesList]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <ChartContainer
      config={config}
      aria-label="Time series chart for selected numeric series"
      className="aspect-[16/9] min-h-[240px] w-full max-w-full"
    >
      <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--color-chart-gridlines)" vertical={false} />
        <XAxis
          dataKey="timestamp"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={formatChartTimestamp}
          tickLine={false}
          axisLine={false}
          minTickGap={32}
        />
        <YAxis tickLine={false} axisLine={false} width={56} />
        <ChartTooltip
          content={<ChartTooltipContent labelFormatter={formatTooltipTimestamp} />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        {seriesList.map((series, index) => {
          const key = chartDataKey(index);
          return (
            <Line
              key={timeSeriesRefKey(series.ref)}
              type="monotone"
              dataKey={key}
              stroke={`var(--color-${key})`}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          );
        })}
      </LineChart>
    </ChartContainer>
  );
}
