import type { NodeDefinition } from '@cognite/sdk';
import { describe, expect, it } from 'vitest';

import { CDF_CDM_SPACE } from '../constants';

import {
  activityRefKey,
  formatActivityTimestamp,
  getActivityIdentifier,
  getActivityTitle,
  getRelevantDate,
  mapNodeToActivitySummary,
} from './activityProperties';
import { COGNITE_ACTIVITY_VIEW_KEY } from './constants';
import type { ActivitySummary } from './types';

function makeActivity(overrides: Partial<ActivitySummary> = {}): ActivitySummary {
  return {
    space: CDF_CDM_SPACE,
    externalId: 'ACT-1',
    ...overrides,
  };
}

function makeNode(
  viewProperties: unknown,
  overrides: Partial<NodeDefinition> = {},
): NodeDefinition {
  return {
    createdTime: 0,
    externalId: 'ACT-1',
    instanceType: 'node',
    lastUpdatedTime: 1_700_000_000_000,
    space: CDF_CDM_SPACE,
    version: 1,
    properties: {
      [CDF_CDM_SPACE]: {
        [COGNITE_ACTIVITY_VIEW_KEY]: viewProperties,
      },
    } as NodeDefinition['properties'],
    ...overrides,
  };
}

describe('activityProperties', () => {
  it('prefers sourceId over externalId for identifier', () => {
    expect(
      getActivityIdentifier(makeActivity({ sourceId: 'SAP-WO-42', externalId: 'ACT-1' })),
    ).toBe('SAP-WO-42');
    expect(getActivityIdentifier(makeActivity({ externalId: 'ACT-1' }))).toBe('ACT-1');
  });

  it('prefers name, then description, then externalId for title', () => {
    expect(getActivityTitle(makeActivity({ name: 'Pump inspection', externalId: 'ACT-1' }))).toBe(
      'Pump inspection',
    );
    expect(getActivityTitle(makeActivity({ description: 'Annual check', externalId: 'ACT-1' }))).toBe(
      'Annual check',
    );
    expect(getActivityTitle(makeActivity({ externalId: 'ACT-1' }))).toBe('ACT-1');
  });

  it('uses endTime before scheduledEndTime for relevant date', () => {
    const withEnd = getRelevantDate(
      makeActivity({ endTime: 100, scheduledEndTime: 200, scheduledStartTime: 50 }),
    );
    expect(withEnd).toEqual({
      timestampMs: 100,
      kind: 'end',
      label: 'Completed',
    });

    const scheduledOnly = getRelevantDate(
      makeActivity({ scheduledEndTime: 200, scheduledStartTime: 50 }),
    );
    expect(scheduledOnly).toEqual({
      timestampMs: 200,
      kind: 'scheduledEnd',
      label: 'Scheduled end',
    });
  });

  it('falls back through schedulable and source timestamps', () => {
    expect(getRelevantDate(makeActivity({ startTime: 10 }))?.kind).toBe('start');
    expect(getRelevantDate(makeActivity({ scheduledStartTime: 20 }))?.kind).toBe('scheduledStart');
    expect(getRelevantDate(makeActivity({ sourceUpdatedTime: 30 }))?.kind).toBe('sourceUpdated');
    expect(getRelevantDate(makeActivity({ lastUpdatedTime: 40 }))?.kind).toBe('lastUpdated');
    expect(getRelevantDate(makeActivity({}))).toBeUndefined();
  });

  it('exposes no client-side recency comparator that could contradict the server ordering', async () => {
    // FR-007 defines recency as CDF's indexed `endTime` sort. A comparator exported from here
    // would invite a caller to re-rank an already-ordered page, which is only globally correct
    // when every page has been fetched.
    const activityProperties = await import('./activityProperties');

    expect(Object.keys(activityProperties).filter((name) => /sort|compare/i.test(name))).toEqual([]);
  });

  it('builds a stable activity ref key', () => {
    expect(activityRefKey({ space: CDF_CDM_SPACE, externalId: 'ACT-9' })).toBe(
      `${CDF_CDM_SPACE}:ACT-9`,
    );
  });

  it('formats a timestamp as a date and time', () => {
    const formatted = formatActivityTimestamp(1_700_000_000_000);
    expect(formatted).toEqual(expect.any(String));
    expect(formatted.length).toBeGreaterThan(0);
  });
});

describe(mapNodeToActivitySummary.name, () => {
  it('maps every CogniteActivity property the panel consumes', () => {
    const summary = mapNodeToActivitySummary(
      makeNode({
        name: 'Pump inspection',
        description: 'Annual check',
        tags: ['mechanical', 'routine'],
        aliases: ['WO-42'],
        sourceId: 'SAP-WO-42',
        sourceContext: 'SAP',
        source: 'SAP-PM',
        sourceCreatedTime: 1_600_000_000_000,
        sourceUpdatedTime: 1_650_000_000_000,
        sourceCreatedUser: 'planner',
        sourceUpdatedUser: 'technician',
        startTime: 1_610_000_000_000,
        endTime: 1_620_000_000_000,
        scheduledStartTime: 1_605_000_000_000,
        scheduledEndTime: 1_615_000_000_000,
      }),
    );

    expect(summary).toEqual({
      space: CDF_CDM_SPACE,
      externalId: 'ACT-1',
      name: 'Pump inspection',
      description: 'Annual check',
      tags: ['mechanical', 'routine'],
      aliases: ['WO-42'],
      sourceId: 'SAP-WO-42',
      sourceContext: 'SAP',
      source: 'SAP-PM',
      sourceCreatedTime: 1_600_000_000_000,
      sourceUpdatedTime: 1_650_000_000_000,
      sourceCreatedUser: 'planner',
      sourceUpdatedUser: 'technician',
      startTime: 1_610_000_000_000,
      endTime: 1_620_000_000_000,
      scheduledStartTime: 1_605_000_000_000,
      scheduledEndTime: 1_615_000_000_000,
      lastUpdatedTime: 1_700_000_000_000,
    });
  });

  it('treats empty strings and non-string values as absent', () => {
    const summary = mapNodeToActivitySummary(
      makeNode({ name: '', description: 42, sourceId: null, source: { nested: true } }),
    );

    expect(summary.name).toBeUndefined();
    expect(summary.description).toBeUndefined();
    expect(summary.sourceId).toBeUndefined();
    expect(summary.source).toBeUndefined();
  });

  it('accepts Date, epoch-number and ISO-string timestamps and rejects unparseable ones', () => {
    expect(
      mapNodeToActivitySummary(makeNode({ endTime: new Date(1_620_000_000_000) })).endTime,
    ).toBe(1_620_000_000_000);
    expect(mapNodeToActivitySummary(makeNode({ endTime: 1_620_000_000_000 })).endTime).toBe(
      1_620_000_000_000,
    );
    expect(mapNodeToActivitySummary(makeNode({ endTime: '2021-05-03T00:00:00.000Z' })).endTime).toBe(
      Date.parse('2021-05-03T00:00:00.000Z'),
    );
    expect(mapNodeToActivitySummary(makeNode({ endTime: 'not a date' })).endTime).toBeUndefined();
    expect(mapNodeToActivitySummary(makeNode({ endTime: new Date('nope') })).endTime).toBeUndefined();
    expect(mapNodeToActivitySummary(makeNode({ endTime: Number.NaN })).endTime).toBeUndefined();
    expect(mapNodeToActivitySummary(makeNode({ endTime: '' })).endTime).toBeUndefined();
    expect(mapNodeToActivitySummary(makeNode({ endTime: true })).endTime).toBeUndefined();
  });

  it('keeps only non-empty strings in list properties and drops empty lists', () => {
    const summary = mapNodeToActivitySummary(
      makeNode({ tags: ['keep', '', 7, null, 'also-keep'], aliases: [] }),
    );

    expect(summary.tags).toEqual(['keep', 'also-keep']);
    expect(summary.aliases).toBeUndefined();
    expect(mapNodeToActivitySummary(makeNode({ tags: 'mechanical' })).tags).toBeUndefined();
    expect(mapNodeToActivitySummary(makeNode({ tags: [1, 2] })).tags).toBeUndefined();
  });

  it('degrades to node identity when the view properties are missing or malformed', () => {
    const noProperties = mapNodeToActivitySummary(makeNode(undefined, { properties: undefined }));
    expect(noProperties).toMatchObject({ space: CDF_CDM_SPACE, externalId: 'ACT-1', name: undefined });

    const spaceNotAnObject = mapNodeToActivitySummary(
      makeNode(undefined, {
        properties: { [CDF_CDM_SPACE]: 'unexpected' } as unknown as NodeDefinition['properties'],
      }),
    );
    expect(spaceNotAnObject.name).toBeUndefined();

    // The view key is present but does not hold an object — the mapper must not throw.
    expect(mapNodeToActivitySummary(makeNode('unexpected')).name).toBeUndefined();
    expect(mapNodeToActivitySummary(makeNode(null)).name).toBeUndefined();
  });
});
