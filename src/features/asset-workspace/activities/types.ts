import type { AssetRef } from '../types';

export type ActivityRef = AssetRef;

export type ActivitySummary = ActivityRef & {
  name?: string;
  description?: string;
  tags?: string[];
  aliases?: string[];
  sourceId?: string;
  sourceContext?: string;
  source?: string;
  sourceCreatedTime?: number;
  sourceUpdatedTime?: number;
  sourceCreatedUser?: string;
  sourceUpdatedUser?: string;
  startTime?: number;
  endTime?: number;
  scheduledStartTime?: number;
  scheduledEndTime?: number;
  lastUpdatedTime?: number;
};

export type ActivityListPage = {
  activities: ActivitySummary[];
  nextCursor?: string;
};
