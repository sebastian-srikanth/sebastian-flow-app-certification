import type { ReactNode } from 'react';

import type { TimeSeriesService } from '../services/TimeSeriesService';

import { TimeSeriesServiceContext } from './timeSeriesServiceContext';

type TimeSeriesServiceProviderProps = {
  timeSeriesService: TimeSeriesService;
  children: ReactNode;
};

export function TimeSeriesServiceProvider({
  timeSeriesService,
  children,
}: TimeSeriesServiceProviderProps) {
  return (
    <TimeSeriesServiceContext.Provider value={{ timeSeriesService }}>
      {children}
    </TimeSeriesServiceContext.Provider>
  );
}
