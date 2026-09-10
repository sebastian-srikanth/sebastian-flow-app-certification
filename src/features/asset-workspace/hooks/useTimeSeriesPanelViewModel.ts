import { useQuery } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { isAccessDeniedError } from '../../../lib/accessErrors';
import { useTimeSeriesService } from '../state/timeSeriesServiceContext';
import { useAppState } from '../state/useAppState';
import {
  buildChartableSelectionKey,
  computeChartAnchorMs,
} from '../time-series/chartAnchor';
import {
  DEFAULT_DURATION_PRESET,
  MAX_SELECTED_TIME_SERIES,
  TIME_SERIES_MAX_RESULTS,
} from '../time-series/constants';
import {
  buildTimeRange,
  getDurationMs,
  selectChartGranularity,
} from '../time-series/timeRange';
import {
  formatTimeSeriesLabel,
  isChartableTimeSeries,
  timeSeriesRefKey,
} from '../time-series/timeSeriesProperties';
import type { ChartDatapointSeries, DurationPresetId, TimeSeriesSummary } from '../time-series/types';
import type { AssetRef } from '../types';

export type TimeSeriesPanelStatus =
  | 'idle'
  | 'loading-series'
  | 'series-error'
  | 'no-access'
  | 'empty-series'
  | 'no-selection'
  | 'loading-chart'
  | 'chart-error'
  | 'no-datapoints'
  | 'ready';

export type TimeSeriesPanelViewModel = {
  status: TimeSeriesPanelStatus;
  linkedSeries: TimeSeriesSummary[];
  /** True when the asset has more linked series than the discovery bound loaded. */
  linkedSeriesTruncated: boolean;
  linkedSeriesLimit: number;
  selectedKeys: string[];
  selectedSeries: TimeSeriesSummary[];
  chartableSelectedSeries: TimeSeriesSummary[];
  nonChartableSelectedSeries: TimeSeriesSummary[];
  durationPreset: DurationPresetId;
  rangeEndMs: number | null;
  chartSeries: ChartDatapointSeries[];
  seriesWithoutDatapoints: TimeSeriesSummary[];
  errorMessage: string | null;
  isRefreshing: boolean;
  maxSelectionReached: boolean;
  toggleSeries: (series: TimeSeriesSummary) => void;
  setDurationPreset: (preset: DurationPresetId) => void;
  refresh: () => void;
  retrySeriesLoad: () => void;
  retryChartLoad: () => void;
};

type TimeSeriesPanelViewModelDeps = {
  useAppState: typeof useAppState;
  useTimeSeriesService: typeof useTimeSeriesService;
};

const defaultDeps: TimeSeriesPanelViewModelDeps = {
  useAppState,
  useTimeSeriesService,
};

export const TimeSeriesPanelViewModelContext =
  createContext<TimeSeriesPanelViewModelDeps>(defaultDeps);

const manualQueryOptions = {
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchInterval: false as const,
  staleTime: Number.POSITIVE_INFINITY,
};

export function useTimeSeriesPanelViewModel(): TimeSeriesPanelViewModel {
  const { useAppState: useAppStateDep, useTimeSeriesService: useTimeSeriesServiceDep } =
    useContext(TimeSeriesPanelViewModelContext);
  const { state } = useAppStateDep();
  const timeSeriesService = useTimeSeriesServiceDep();

  const selectedAsset = state.selectedAsset;
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [durationPreset, setDurationPresetState] = useState<DurationPresetId>(DEFAULT_DURATION_PRESET);

  const linkedSeriesQuery = useQuery({
    queryKey: ['linked-time-series', selectedAsset?.space, selectedAsset?.externalId],
    queryFn: () => timeSeriesService.listLinkedTimeSeries(selectedAsset as AssetRef),
    enabled: Boolean(selectedAsset),
    ...manualQueryOptions,
    staleTime: 0,
  });

  const linkedSeries = useMemo(
    () => linkedSeriesQuery.data?.series ?? [],
    [linkedSeriesQuery.data],
  );

  const linkedSeriesTruncated = linkedSeriesQuery.data?.truncated ?? false;

  const selectedSeries = useMemo(
    () => linkedSeries.filter((series) => selectedKeys.includes(timeSeriesRefKey(series))),
    [linkedSeries, selectedKeys],
  );

  const chartableSelectedSeries = useMemo(
    () => selectedSeries.filter(isChartableTimeSeries),
    [selectedSeries],
  );

  const nonChartableSelectedSeries = useMemo(
    () => selectedSeries.filter((series) => !isChartableTimeSeries(series)),
    [selectedSeries],
  );

  const chartableRefs = useMemo(
    () => chartableSelectedSeries.map(({ space, externalId }) => ({ space, externalId })),
    [chartableSelectedSeries],
  );

  const chartableSelectionKey = useMemo(
    () => buildChartableSelectionKey(chartableRefs),
    [chartableRefs],
  );

  const latestQuery = useQuery({
    queryKey: ['time-series-latest', chartableSelectionKey],
    queryFn: () => timeSeriesService.retrieveLatestDatapoints(chartableRefs),
    enabled: chartableRefs.length > 0,
    ...manualQueryOptions,
    staleTime: 0,
  });

  const rangeEndMs = useMemo(
    () =>
      computeChartAnchorMs(chartableRefs, latestQuery.data ?? [], {
        isPlaceholderData: latestQuery.isPlaceholderData,
      }),
    [chartableRefs, latestQuery.data, latestQuery.isPlaceholderData],
  );

  const durationMs = getDurationMs(durationPreset);
  const timeRange = rangeEndMs !== null ? buildTimeRange(rangeEndMs, durationMs) : null;
  const granularity = selectChartGranularity(durationMs);

  const chartQuery = useQuery({
    queryKey: [
      'time-series-chart',
      chartableRefs.map(timeSeriesRefKey).join('|'),
      timeRange?.startMs,
      timeRange?.endMs,
      granularity,
    ],
    queryFn: () =>
      timeSeriesService.retrieveChartDatapoints(
        chartableRefs,
        new Date(timeRange!.startMs),
        new Date(timeRange!.endMs),
        granularity,
      ),
    enabled: Boolean(timeRange && chartableRefs.length > 0),
    ...manualQueryOptions,
  });

  const latestByKey = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const item of latestQuery.data ?? []) {
      map.set(timeSeriesRefKey(item.ref), item.hasData);
    }
    return map;
  }, [latestQuery.data]);

  const seriesWithoutDatapoints = useMemo(
    () =>
      chartableSelectedSeries.filter((series) => latestByKey.get(timeSeriesRefKey(series)) === false),
    [chartableSelectedSeries, latestByKey],
  );

  const allSelectedHaveNoDatapoints =
    chartableSelectedSeries.length > 0 &&
    chartableSelectedSeries.every((series) => latestByKey.get(timeSeriesRefKey(series)) === false);

  const toggleSeries = useCallback((series: TimeSeriesSummary) => {
    const key = timeSeriesRefKey(series);
    setSelectedKeys((current) => {
      if (current.includes(key)) {
        return current.filter((item) => item !== key);
      }

      if (current.length >= MAX_SELECTED_TIME_SERIES) {
        return current;
      }

      return [...current, key];
    });
  }, []);

  const setDurationPreset = useCallback((preset: DurationPresetId) => {
    setDurationPresetState(preset);
  }, []);

  const refresh = useCallback(() => {
    void latestQuery.refetch();
    if (timeRange) {
      void chartQuery.refetch();
    }
  }, [chartQuery, latestQuery, timeRange]);

  const retrySeriesLoad = useCallback(() => {
    void linkedSeriesQuery.refetch();
  }, [linkedSeriesQuery]);

  const retryChartLoad = useCallback(() => {
    void latestQuery.refetch();
    void chartQuery.refetch();
  }, [chartQuery, latestQuery]);

  const hasAccessDeniedError = useMemo(() => {
    const errors = [linkedSeriesQuery.error, latestQuery.error, chartQuery.error];
    return errors.some((error) => isAccessDeniedError(error));
  }, [linkedSeriesQuery.error, latestQuery.error, chartQuery.error]);

  const status: TimeSeriesPanelStatus = useMemo(() => {
    if (!selectedAsset) return 'idle';
    if (linkedSeriesQuery.isLoading) return 'loading-series';
    if (linkedSeriesQuery.isError) {
      return isAccessDeniedError(linkedSeriesQuery.error) ? 'no-access' : 'series-error';
    }
    if (linkedSeries.length === 0) return 'empty-series';
    if (selectedSeries.length === 0) return 'no-selection';
    if (latestQuery.isLoading || latestQuery.isFetching) return 'loading-chart';
    if (hasAccessDeniedError) return 'no-access';
    if (latestQuery.isError || chartQuery.isError) return 'chart-error';
    if (allSelectedHaveNoDatapoints) return 'no-datapoints';
    if (chartQuery.isLoading || chartQuery.isFetching) return 'loading-chart';
    return 'ready';
  }, [
    selectedAsset,
    linkedSeriesQuery.isLoading,
    linkedSeriesQuery.isError,
    linkedSeriesQuery.error,
    linkedSeries.length,
    selectedSeries.length,
    latestQuery.isLoading,
    latestQuery.isFetching,
    latestQuery.isError,
    hasAccessDeniedError,
    chartQuery.isError,
    chartQuery.isLoading,
    chartQuery.isFetching,
    allSelectedHaveNoDatapoints,
  ]);

  const errorMessage = useMemo(() => {
    if (status === 'no-access') return null;
    if (linkedSeriesQuery.error instanceof Error) return linkedSeriesQuery.error.message;
    if (latestQuery.error instanceof Error) return latestQuery.error.message;
    if (chartQuery.error instanceof Error) return chartQuery.error.message;
    if (linkedSeriesQuery.isError || latestQuery.isError || chartQuery.isError) {
      return 'Unable to load time series data. Try again in a moment.';
    }
    return null;
  }, [
    status,
    linkedSeriesQuery.error,
    linkedSeriesQuery.isError,
    latestQuery.error,
    latestQuery.isError,
    chartQuery.error,
    chartQuery.isError,
  ]);

  return {
    status,
    linkedSeries,
    linkedSeriesTruncated,
    linkedSeriesLimit: TIME_SERIES_MAX_RESULTS,
    selectedKeys,
    selectedSeries,
    chartableSelectedSeries,
    nonChartableSelectedSeries,
    durationPreset,
    rangeEndMs,
    chartSeries: chartQuery.data ?? [],
    seriesWithoutDatapoints,
    errorMessage,
    isRefreshing:
      (latestQuery.isFetching || chartQuery.isFetching) &&
      !latestQuery.isLoading &&
      !chartQuery.isLoading &&
      selectedKeys.length > 0,
    maxSelectionReached: selectedKeys.length >= MAX_SELECTED_TIME_SERIES,
    toggleSeries,
    setDurationPreset,
    refresh,
    retrySeriesLoad,
    retryChartLoad,
  };
}

export function formatSeriesTypeLabel(type: TimeSeriesSummary['type']): string {
  if (type === 'numeric') return 'Numeric';
  if (type === 'string') return 'String';
  if (type === 'state') return 'State';
  return 'Unknown';
}

export function formatSeriesListLabel(series: TimeSeriesSummary): string {
  return formatTimeSeriesLabel(series);
}
