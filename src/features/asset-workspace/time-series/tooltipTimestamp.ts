import type { ReactNode } from 'react';

type TooltipPayloadItem = {
  payload?: Record<string, unknown>;
};

export function formatChartTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTooltipTimestamp(
  _seriesLabel: ReactNode,
  payload: TooltipPayloadItem[],
): string {
  const [firstItem] = payload;
  const timestamp = firstItem?.payload?.timestamp;
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    return 'Unknown time';
  }
  return formatChartTimestamp(timestamp);
}
