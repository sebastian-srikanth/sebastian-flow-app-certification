import type { ActivityListPage } from '../activities/types';
import type { AssetRef } from '../types';


export type ActivityService = {
  listRelatedActivities: (asset: AssetRef, cursor?: string) => Promise<ActivityListPage>;
};
