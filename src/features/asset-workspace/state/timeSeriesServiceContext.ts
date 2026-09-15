import { createContext, useContext } from 'react';

import type { TimeSeriesService } from '../services/TimeSeriesService';

type TimeSeriesServiceContextValue = {
  timeSeriesService: TimeSeriesService;
};

export const TimeSeriesServiceContext = createContext<TimeSeriesServiceContextValue | null>(null);

export function useTimeSeriesService(): TimeSeriesService {
  const context = useContext(TimeSeriesServiceContext);
  if (!context) {
    throw new Error('useTimeSeriesService must be used within TimeSeriesServiceProvider');
  }
  return context.timeSeriesService;
}
