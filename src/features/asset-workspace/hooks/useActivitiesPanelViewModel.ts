import { useInfiniteQuery } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import {
  getActivityErrorMessage,
  isAccessDeniedError,
} from '../activities/activityErrors';
import { activityRefKey } from '../activities/activityProperties';
import { ACTIVITY_VISIBLE_INCREMENT } from '../activities/constants';
import type { ActivitySummary } from '../activities/types';
import { useActivityService } from '../state/activityServiceContext';
import { useAppState } from '../state/useAppState';
import type { AssetRef } from '../types';

export type ActivitiesPanelStatus =
  | 'idle'
  | 'loading'
  | 'error'
  | 'no-access'
  | 'empty'
  | 'ready';

export type ActivitiesPanelViewModel = {
  status: ActivitiesPanelStatus;
  activities: ActivitySummary[];
  visibleActivities: ActivitySummary[];
  selectedActivity: ActivitySummary | null;
  errorMessage: string | null;
  canLoadMore: boolean;
  isFetchingMore: boolean;
  selectActivity: (activity: ActivitySummary | null) => void;
  loadMore: () => void;
  retry: () => void;
};

type ActivitiesPanelViewModelDeps = {
  useAppState: typeof useAppState;
  useActivityService: typeof useActivityService;
};

const defaultDeps: ActivitiesPanelViewModelDeps = {
  useAppState,
  useActivityService,
};

export const ActivitiesPanelViewModelContext =
  createContext<ActivitiesPanelViewModelDeps>(defaultDeps);

const manualQueryOptions = {
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchInterval: false as const,
  staleTime: Number.POSITIVE_INFINITY,
};

export function useActivitiesPanelViewModel(): ActivitiesPanelViewModel {
  const { useAppState: useAppStateDep, useActivityService: useActivityServiceDep } =
    useContext(ActivitiesPanelViewModelContext);
  const { state } = useAppStateDep();
  const activityService = useActivityServiceDep();

  const selectedAsset = state.selectedAsset;
  const [visibleCount, setVisibleCount] = useState(ACTIVITY_VISIBLE_INCREMENT);
  const [selectedActivity, setSelectedActivity] = useState<ActivitySummary | null>(null);

  const activitiesQuery = useInfiniteQuery({
    queryKey: ['related-activities', selectedAsset?.space, selectedAsset?.externalId],
    queryFn: ({ pageParam }) =>
      activityService.listRelatedActivities(selectedAsset as AssetRef, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(selectedAsset),
    ...manualQueryOptions,
    staleTime: 0,
  });

  // Concatenation only. CDF already returned every page in one cursorable `endTime` ordering, so
  // appending pages keeps the displayed order globally correct; re-sorting the fetched prefix here
  // would rank rows against a comparator the unfetched pages were never ordered by.
  const activities = useMemo(
    () => activitiesQuery.data?.pages.flatMap((page) => page.activities) ?? [],
    [activitiesQuery.data?.pages],
  );

  const visibleActivities = useMemo(
    () => activities.slice(0, visibleCount),
    [activities, visibleCount],
  );

  const hasHiddenFetchedActivities = visibleCount < activities.length;
  const hasNextServerPage = Boolean(activitiesQuery.hasNextPage);
  const canLoadMore = hasHiddenFetchedActivities || hasNextServerPage;

  const loadMore = useCallback(() => {
    if (visibleCount < activities.length) {
      setVisibleCount((current) => current + ACTIVITY_VISIBLE_INCREMENT);
      return;
    }

    if (activitiesQuery.hasNextPage && !activitiesQuery.isFetchingNextPage) {
      void activitiesQuery.fetchNextPage().then(() => {
        setVisibleCount((current) => current + ACTIVITY_VISIBLE_INCREMENT);
      });
    }
  }, [activities.length, activitiesQuery, visibleCount]);

  const retry = useCallback(() => {
    setVisibleCount(ACTIVITY_VISIBLE_INCREMENT);
    setSelectedActivity(null);
    void activitiesQuery.refetch();
  }, [activitiesQuery]);

  const selectActivity = useCallback((activity: ActivitySummary | null) => {
    setSelectedActivity(activity);
  }, []);

  const status: ActivitiesPanelStatus = useMemo(() => {
    if (!selectedAsset) return 'idle';
    if (activitiesQuery.isLoading) return 'loading';
    if (activitiesQuery.isError) {
      return isAccessDeniedError(activitiesQuery.error) ? 'no-access' : 'error';
    }
    if (activities.length === 0) return 'empty';
    return 'ready';
  }, [
    selectedAsset,
    activitiesQuery.isLoading,
    activitiesQuery.isError,
    activitiesQuery.error,
    activities.length,
  ]);

  const errorMessage = useMemo(() => {
    if (!activitiesQuery.error) return null;
    return getActivityErrorMessage(activitiesQuery.error);
  }, [activitiesQuery.error]);

  return {
    status,
    activities,
    visibleActivities,
    selectedActivity,
    errorMessage,
    canLoadMore,
    isFetchingMore: activitiesQuery.isFetchingNextPage,
    selectActivity,
    loadMore,
    retry,
  };
}

export function getActivityRowKey(activity: ActivitySummary): string {
  return activityRefKey(activity);
}
