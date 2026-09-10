import { Alert, AlertDescription } from '@cognite/aura/components/alert';
import { Button } from '@cognite/aura/components/button';
import {
  CheckboxItem,
  CheckboxItemControl,
  CheckboxItemDescription,
  CheckboxItemLabel,
} from '@cognite/aura/components/checkbox';
import { Loader } from '@cognite/aura/components/loader';
import { IconRefresh } from '@tabler/icons-react';
import { Suspense, lazy } from 'react';

import { getSecondaryExternalId } from '../displayLabels';
import {
  formatSeriesListLabel,
  formatSeriesTypeLabel,
  useTimeSeriesPanelViewModel,
} from '../hooks/useTimeSeriesPanelViewModel';
import { DURATION_PRESETS, MAX_SELECTED_TIME_SERIES } from '../time-series/constants';
import {
  formatTimeSeriesLabel,
  isChartableTimeSeries,
  timeSeriesRefKey,
} from '../time-series/timeSeriesProperties';
import type { TimeSeriesSummary } from '../time-series/types';

import { WorkspaceSection } from './WorkspaceSection';

/*
 * recharts is only needed once the analyst opts into plotting a series, which never happens on
 * first paint (no series is selected by default), so it is loaded on demand.
 */
const TimeSeriesChart = lazy(async () => ({
  default: (await import('./TimeSeriesChart')).TimeSeriesChart,
}));

function formatSeriesMeta(series: TimeSeriesSummary): string {
  const parts: string[] = [formatSeriesTypeLabel(series.type)];
  if (series.sourceUnit) parts.push(series.sourceUnit);
  if (series.isStep) parts.push('Step');
  return parts.join(' · ');
}

function SeriesRow({
  series,
  isSelected,
  disabled,
  onToggle,
}: {
  series: TimeSeriesSummary;
  isSelected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const label = formatTimeSeriesLabel(series);
  const secondaryId = getSecondaryExternalId(series.name, series.externalId);
  const chartable = isChartableTimeSeries(series);

  return (
    <li className="min-w-0">
      {/* CheckboxItem renders the <label>, so the whole row is the checkbox's hit target. */}
      <CheckboxItem className="flex min-w-0 items-center gap-3 px-3 py-1.5">
        <CheckboxItemControl
          checked={isSelected}
          disabled={disabled}
          onCheckedChange={onToggle}
          aria-label={`Plot ${formatSeriesListLabel(series)}`}
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <CheckboxItemLabel className="truncate text-sm font-medium">{label}</CheckboxItemLabel>
            {secondaryId ? (
              <span className="shrink-0 truncate font-mono text-xs text-muted-foreground">
                {secondaryId}
              </span>
            ) : null}
          </div>
          <CheckboxItemDescription className="truncate text-xs text-muted-foreground">
            {formatSeriesMeta(series)}
          </CheckboxItemDescription>
          {!chartable ? (
            <span className="block text-xs text-muted-foreground">
              Not chartable ({formatSeriesTypeLabel(series.type)})
            </span>
          ) : null}
        </div>
      </CheckboxItem>
    </li>
  );
}

export function TimeSeriesPanel() {
  const viewModel = useTimeSeriesPanelViewModel();
  const {
    status,
    linkedSeries,
    linkedSeriesTruncated,
    linkedSeriesLimit,
    selectedKeys,
    chartableSelectedSeries,
    nonChartableSelectedSeries,
    durationPreset,
    chartSeries,
    seriesWithoutDatapoints,
    errorMessage,
    isRefreshing,
    maxSelectionReached,
    toggleSeries,
    setDurationPreset,
    refresh,
    retrySeriesLoad,
    retryChartLoad,
  } = viewModel;

  const chartableWithData = chartSeries.filter((series) => series.datapoints.length > 0);

  return (
    <WorkspaceSection
      title="Time series"
      description={`Select up to ${MAX_SELECTED_TIME_SERIES} numeric series to plot. Use Refresh to load the latest data.`}
      aria-label="Time series panel"
      actions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={selectedKeys.length === 0 || status === 'loading-chart'}
          aria-label="Refresh time series chart"
        >
          <IconRefresh aria-hidden className="size-4" />
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      }
    >
      {status === 'loading-series' && (
        <div className="inline-flex items-center gap-2 text-muted-foreground" aria-live="polite">
          <Loader size={20} />
          <span>Loading linked time series…</span>
        </div>
      )}

      {status === 'series-error' && (
        <div className="flex flex-col gap-3">
          <Alert variant="error">
            <AlertDescription>
              {errorMessage ?? 'Unable to load time series for this asset.'}
            </AlertDescription>
          </Alert>
          <Button type="button" variant="outline" size="sm" onClick={retrySeriesLoad}>
            Retry
          </Button>
        </div>
      )}

      {status === 'no-access' && (
        <Alert variant="secondary">
          <AlertDescription>
            You don&apos;t have access to time-series data for this asset.
          </AlertDescription>
        </Alert>
      )}

      {status === 'empty-series' && (
        <Alert variant="secondary">
          <AlertDescription>No time series are linked to this asset.</AlertDescription>
        </Alert>
      )}

      {linkedSeries.length > 0 &&
        status !== 'loading-series' &&
        status !== 'series-error' &&
        status !== 'no-access' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium">
              Linked series
              <span className="ml-2 font-normal text-muted-foreground">
                {linkedSeriesTruncated
                  ? `(first ${linkedSeriesLimit})`
                  : `(${linkedSeries.length})`}
              </span>
            </span>
            {maxSelectionReached ? (
              <span className="text-xs text-muted-foreground">
                Maximum of {MAX_SELECTED_TIME_SERIES} selected
              </span>
            ) : null}
          </div>
          <ul
            className="max-h-64 divide-y overflow-y-auto rounded-md border"
            aria-label="Linked time series"
          >
            {linkedSeries.map((series) => {
              const key = timeSeriesRefKey(series);
              const isSelected = selectedKeys.includes(key);
              const chartable = isChartableTimeSeries(series);
              const disabled = !chartable || (!isSelected && maxSelectionReached);

              return (
                <SeriesRow
                  key={key}
                  series={series}
                  isSelected={isSelected}
                  disabled={disabled}
                  onToggle={() => toggleSeries(series)}
                />
              );
            })}
          </ul>
          {linkedSeriesTruncated ? (
            <Alert variant="secondary">
              <AlertDescription>
                This asset has more than {linkedSeriesLimit} linked time series. The first{' '}
                {linkedSeriesLimit} are listed to keep the page responsive.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      )}

      {status === 'no-selection' && (
        <Alert variant="secondary">
          <AlertDescription>Select one or more time series to plot.</AlertDescription>
        </Alert>
      )}

      {nonChartableSelectedSeries.length > 0 && (
        <Alert variant="secondary">
          <AlertDescription>
            {nonChartableSelectedSeries.length} selected series cannot be charted — only numeric
            series are supported.
          </AlertDescription>
        </Alert>
      )}

      {(status === 'loading-chart' || isRefreshing) && selectedKeys.length > 0 && (
        <div className="inline-flex items-center gap-2 text-muted-foreground" aria-live="polite">
          <Loader size={20} />
          <span>Loading chart data…</span>
        </div>
      )}

      {status === 'chart-error' && (
        <div className="flex flex-col gap-3">
          <Alert variant="error">
            <AlertDescription>
              {errorMessage ?? 'Unable to load chart data for the selected series.'}
            </AlertDescription>
          </Alert>
          <Button type="button" variant="outline" size="sm" onClick={retryChartLoad}>
            Retry
          </Button>
        </div>
      )}

      {status === 'no-datapoints' && (
        <Alert variant="secondary">
          <AlertDescription>
            No datapoints were found for the selected series. Your selection is kept so you can
            retry or choose a different range.
          </AlertDescription>
        </Alert>
      )}

      {seriesWithoutDatapoints.length > 0 && status !== 'no-datapoints' && (
        <Alert variant="secondary">
          <AlertDescription>
            No datapoints for:{' '}
            {seriesWithoutDatapoints.map((series) => formatTimeSeriesLabel(series)).join(', ')}.
          </AlertDescription>
        </Alert>
      )}

      {chartableSelectedSeries.length > 0 && status !== 'no-datapoints' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Time range">
            {DURATION_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant={durationPreset === preset.id ? 'default' : 'outline'}
                aria-pressed={durationPreset === preset.id}
                onClick={() => setDurationPreset(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {chartableWithData.length > 0 && (status === 'ready' || isRefreshing) && (
            <Suspense
              fallback={
                <div
                  className="inline-flex items-center gap-2 text-muted-foreground"
                  aria-live="polite"
                >
                  <Loader size={20} />
                  <span>Loading chart…</span>
                </div>
              }
            >
              <TimeSeriesChart seriesList={chartableWithData} />
            </Suspense>
          )}
        </div>
      )}
    </WorkspaceSection>
  );
}
