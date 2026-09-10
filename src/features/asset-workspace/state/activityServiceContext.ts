import { createContext, useContext } from 'react';

import type { ActivityService } from '../services/ActivityService';

type ActivityServiceContextValue = {
  activityService: ActivityService;
};

export const ActivityServiceContext = createContext<ActivityServiceContextValue | null>(null);

export function useActivityService(): ActivityService {
  const context = useContext(ActivityServiceContext);
  if (!context) {
    throw new Error('useActivityService must be used within ActivityServiceProvider');
  }
  return context.activityService;
}
