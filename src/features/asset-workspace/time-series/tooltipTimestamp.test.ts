import { describe, expect, it } from 'vitest';

import { formatChartTimestamp, formatTooltipTimestamp } from './tooltipTimestamp';

const TIMESTAMP = Date.UTC(2026, 8, 15, 6, 0);
const FORMATTED_TIMESTAMP = new Date(TIMESTAMP).toLocaleString(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

describe(formatChartTimestamp.name, () => {
  it('formats an epoch timestamp for the chart locale', () => {
    expect(formatChartTimestamp(TIMESTAMP)).toBe(FORMATTED_TIMESTAMP);
  });
});

describe(formatTooltipTimestamp.name, () => {
  it('formats the hovered row timestamp instead of the Aura series label', () => {
    expect(
      formatTooltipTimestamp('21-VT-2002 (mm/s)', [{ payload: { timestamp: TIMESTAMP } }]),
    ).toBe(FORMATTED_TIMESTAMP);
  });

  it('uses a safe fallback when the tooltip payload has no valid timestamp', () => {
    expect(formatTooltipTimestamp('21-VT-2002 (mm/s)', [])).toBe('Unknown time');
    expect(
      formatTooltipTimestamp('21-VT-2002 (mm/s)', [{ payload: { timestamp: Number.NaN } }]),
    ).toBe('Unknown time');
  });
});
