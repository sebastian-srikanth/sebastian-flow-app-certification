import { Badge } from '@cognite/aura/components/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@cognite/aura/components/dialog';

import {
  formatActivityTimestamp,
  getActivityIdentifier,
  getActivityTitle,
  getRelevantDate,
} from '../activities/activityProperties';
import type { ActivitySummary } from '../activities/types';

type ActivityDetailField = {
  label: string;
  value: string;
};

function buildDetailFields(activity: ActivitySummary): ActivityDetailField[] {
  const fields: ActivityDetailField[] = [
    { label: 'Identifier (source)', value: getActivityIdentifier(activity) },
    { label: 'External ID', value: activity.externalId },
  ];

  if (activity.name) fields.push({ label: 'Name', value: activity.name });
  if (activity.description) fields.push({ label: 'Description', value: activity.description });
  if (activity.tags?.length) fields.push({ label: 'Tags', value: activity.tags.join(', ') });
  if (activity.aliases?.length) {
    fields.push({ label: 'Aliases', value: activity.aliases.join(', ') });
  }
  if (activity.source) fields.push({ label: 'Source', value: activity.source });
  if (activity.sourceContext) {
    fields.push({ label: 'Source context', value: activity.sourceContext });
  }
  if (activity.sourceCreatedUser) {
    fields.push({ label: 'Source created by', value: activity.sourceCreatedUser });
  }
  if (activity.sourceUpdatedUser) {
    fields.push({ label: 'Source updated by', value: activity.sourceUpdatedUser });
  }

  const timestampFields: Array<[string, number | undefined]> = [
    ['Start time', activity.startTime],
    ['End time', activity.endTime],
    ['Scheduled start time', activity.scheduledStartTime],
    ['Scheduled end time', activity.scheduledEndTime],
    ['Source created time', activity.sourceCreatedTime],
    ['Source updated time', activity.sourceUpdatedTime],
    ['Last updated time', activity.lastUpdatedTime],
  ];

  for (const [label, timestampMs] of timestampFields) {
    if (timestampMs !== undefined) {
      fields.push({ label, value: formatActivityTimestamp(timestampMs) });
    }
  }

  return fields;
}

type ActivityDetailDialogProps = {
  activity: ActivitySummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ActivityDetailDialog({ activity, open, onOpenChange }: ActivityDetailDialogProps) {
  if (!activity) return null;

  const fields = buildDetailFields(activity);
  const relevantDate = getRelevantDate(activity);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getActivityTitle(activity)}</DialogTitle>
          <DialogDescription>
            Maintenance or work activity linked to this asset. Status isn&apos;t available for
            these activity records.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {relevantDate ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">{relevantDate.label}</span>
              <Badge variant="nordic" background>
                {formatActivityTimestamp(relevantDate.timestampMs)}
              </Badge>
            </div>
          ) : null}

          <dl className="grid gap-3 text-sm">
            {fields.map((field) => (
              <div key={field.label} className="grid min-w-0 gap-1">
                <dt className="font-medium text-muted-foreground">{field.label}</dt>
                <dd className="break-words">{field.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  );
}
