import type { ReactNode } from 'react';

import type { ActivityService } from '../services/ActivityService';

import { ActivityServiceContext } from './activityServiceContext';

type ActivityServiceProviderProps = {
  activityService: ActivityService;
  children: ReactNode;
};

export function ActivityServiceProvider({
  activityService,
  children,
}: ActivityServiceProviderProps) {
  return (
    <ActivityServiceContext.Provider value={{ activityService }}>
      {children}
    </ActivityServiceContext.Provider>
  );
}
