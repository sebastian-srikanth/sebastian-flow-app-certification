import { Alert, AlertDescription } from '@cognite/aura/components/alert';
import { Badge } from '@cognite/aura/components/badge';
import { Button } from '@cognite/aura/components/button';
import { Loader } from '@cognite/aura/components/loader';

import {
  formatActivityTimestamp,
  getActivityIdentifier,
  getActivityTitle,
  getRelevantDate,
} from '../activities/activityProperties';
import type { ActivitySummary } from '../activities/types';
import { getSecondaryExternalId } from '../displayLabels';
import {
  getActivityRowKey,
  useActivitiesPanelViewModel,
} from '../hooks/useActivitiesPanelViewModel';

import { ActivityDetailDialog } from './ActivityDetailDialog';
import { WorkspaceSection } from './WorkspaceSection';

function ActivityRow({
  activity,
  onSelect,
}: {
  activity: ActivitySummary;
  onSelect: (activity: ActivitySummary) => void;
}) {
  const relevantDate = getRelevantDate(activity);
  const identifier = getActivityIdentifier(activity);
  const title = getActivityTitle(activity);
  const secondaryId = getSecondaryExternalId(activity.name, activity.externalId);

  return (
    <li className="min-w-0">
      <Button
        type="button"
        variant="ghost"
        className="h-auto w-full min-w-0 justify-start rounded-md border px-3 py-3 text-left"
        onClick={() => onSelect(activity)}
        aria-label={`View details for activity ${identifier}`}
      >
        <div className="grid w-full min-w-0 grid-cols-1 gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-3">
          <div className="min-w-0">
            <p className="break-words font-medium leading-snug">{title}</p>
            {activity.description && activity.name ? (
              <p className="mt-1 line-clamp-2 break-words text-sm text-muted-foreground">
                {activity.description}
              </p>
            ) : null}
            {secondaryId ? (
              <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{secondaryId}</p>
            ) : null}
          </div>

          <div className="flex min-w-0 shrink-0 flex-col items-start gap-1 sm:items-end">
            <Badge variant="nordic" className="max-w-full truncate">
              {identifier}
            </Badge>
            <div className="text-xs text-muted-foreground">
              {relevantDate ? (
                <>
                  <span>{relevantDate.label}</span>{' '}
                  <span className="whitespace-nowrap">
                    {formatActivityTimestamp(relevantDate.timestampMs)}
                  </span>
                </>
              ) : (
                <span>No date available</span>
              )}
            </div>
            {activity.sourceContext ? (
              <span className="truncate text-xs text-muted-foreground">{activity.sourceContext}</span>
            ) : null}
          </div>
        </div>
      </Button>
    </li>
  );
}

export function ActivitiesPanel() {
  const viewModel = useActivitiesPanelViewModel();
  const {
    status,
    visibleActivities,
    selectedActivity,
    errorMessage,
    canLoadMore,
    isFetchingMore,
    selectActivity,
    loadMore,
    retry,
  } = viewModel;

  return (
    <>
      <WorkspaceSection
        title="Work orders / activities"
        description="Maintenance and work activities linked to this asset, ordered by completion date — most recently completed first, with activities that have no completion date listed first. Status isn't available for these activity records."
        aria-label="Work orders and activities panel"
      >
        {status === 'loading' && (
          <div className="inline-flex items-center gap-2 text-muted-foreground" aria-live="polite">
            <Loader size={20} />
            <span>Loading related work orders…</span>
          </div>
        )}

        {status === 'no-access' && (
          <Alert variant="secondary">
            <AlertDescription>
              You do not have access to work order data for this asset. Contact your CDF
              administrator if you believe this is incorrect.
            </AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <div className="flex flex-col gap-3">
            <Alert variant="error">
              <AlertDescription>
                {errorMessage ?? 'Unable to load work orders for this asset.'}
              </AlertDescription>
            </Alert>
            <Button type="button" variant="outline" size="sm" onClick={retry}>
              Retry
            </Button>
          </div>
        )}

        {status === 'empty' && (
          <Alert variant="secondary">
            <AlertDescription>
              No work orders or maintenance activities are linked to this asset.
            </AlertDescription>
          </Alert>
        )}

        {visibleActivities.length > 0 && status !== 'loading' && (
          <ul className="flex min-w-0 flex-col gap-2 overflow-hidden">
            {visibleActivities.map((activity) => (
              <ActivityRow
                key={getActivityRowKey(activity)}
                activity={activity}
                onSelect={selectActivity}
              />
            ))}
          </ul>
        )}

        {canLoadMore && status === 'ready' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={isFetchingMore}
            className="mt-2"
          >
            {isFetchingMore ? 'Loading more…' : 'Load more'}
          </Button>
        )}
      </WorkspaceSection>

      <ActivityDetailDialog
        activity={selectedActivity}
        open={selectedActivity !== null}
        onOpenChange={(open) => {
          if (!open) selectActivity(null);
        }}
      />
    </>
  );
}
