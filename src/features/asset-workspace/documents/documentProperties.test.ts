import type { NodeDefinition } from '@cognite/sdk';
import { describe, expect, it } from 'vitest';

import { CDF_CDM_SPACE } from '../constants';

import { COGNITE_FILE_VIEW_KEY } from './constants';
import {
  compareDocumentsByRecency,
  documentRefKey,
  formatDocumentTimestamp,
  getDocumentDisplayName,
  getDocumentTimestamp,
  getDocumentTimestampMs,
  getDocumentTypeLabel,
  isDocumentContentAvailable,
  mapNodeToDocumentSummary,
  sortDocumentsByRecency,
} from './documentProperties';
import type { DocumentSummary } from './types';

function makeDocument(overrides: Partial<DocumentSummary> = {}): DocumentSummary {
  return { space: CDF_CDM_SPACE, externalId: 'FILE-1', ...overrides };
}

function makeNode(
  viewProperties: unknown,
  overrides: Partial<NodeDefinition> = {},
): NodeDefinition {
  return {
    createdTime: 0,
    externalId: 'FILE-1',
    instanceType: 'node',
    lastUpdatedTime: 1_700_000_000_000,
    space: CDF_CDM_SPACE,
    version: 1,
    properties: {
      [CDF_CDM_SPACE]: {
        [COGNITE_FILE_VIEW_KEY]: viewProperties,
      },
    } as NodeDefinition['properties'],
    ...overrides,
  };
}

describe('documentProperties', () => {
  it('prefers name, then sourceId, then externalId for display name', () => {
    const withName: DocumentSummary = {
      space: 'cdf_cdm',
      externalId: 'FILE-1',
      name: 'Manual.pdf',
      sourceId: 'SRC-1',
    };
    const withSourceId: DocumentSummary = {
      space: 'cdf_cdm',
      externalId: 'FILE-2',
      sourceId: 'SRC-2',
    };
    const minimal: DocumentSummary = { space: 'cdf_cdm', externalId: 'FILE-3' };

    expect(getDocumentDisplayName(withName)).toBe('Manual.pdf');
    expect(getDocumentDisplayName(withSourceId)).toBe('SRC-2');
    expect(getDocumentDisplayName(minimal)).toBe('FILE-3');
  });

  it('labels MIME types with friendly names', () => {
    expect(
      getDocumentTypeLabel({
        space: 'cdf_cdm',
        externalId: 'F1',
        mimeType: 'application/pdf',
      }),
    ).toBe('PDF');
    expect(
      getDocumentTypeLabel({
        space: 'cdf_cdm',
        externalId: 'F2',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    ).toBe('Word');
  });

  it('prefers sourceUpdatedTime, then uploadedTime, then lastUpdatedTime', () => {
    const sourceUpdated: DocumentSummary = {
      space: 'cdf_cdm',
      externalId: 'F1',
      sourceUpdatedTime: 100,
      uploadedTime: 200,
      lastUpdatedTime: 300,
    };
    const uploadedOnly: DocumentSummary = {
      space: 'cdf_cdm',
      externalId: 'F2',
      uploadedTime: 200,
      lastUpdatedTime: 300,
    };
    const cdfOnly: DocumentSummary = {
      space: 'cdf_cdm',
      externalId: 'F3',
      lastUpdatedTime: 300,
    };

    expect(getDocumentTimestamp(sourceUpdated)?.label).toBe('Modified');
    expect(getDocumentTimestamp(uploadedOnly)?.label).toBe('Uploaded');
    expect(getDocumentTimestamp(cdfOnly)?.label).toBe('CDF updated');
  });

  it('formats timestamps without crashing on missing optional metadata', () => {
    const minimal = mapNodeToDocumentSummary({
      createdTime: 0,
      externalId: 'FILE-MIN',
      instanceType: 'node',
      lastUpdatedTime: 1_700_000_000_000,
      space: 'cdf_cdm',
      version: 1,
      properties: {},
    });

    expect(minimal.name).toBeUndefined();
    expect(formatDocumentTimestamp(1_700_000_000_000)).toMatch(/\d/);
  });

  it('treats isUploaded false as unavailable content', () => {
    expect(
      isDocumentContentAvailable({
        space: 'cdf_cdm',
        externalId: 'F1',
        isUploaded: false,
      }),
    ).toBe(false);
    expect(
      isDocumentContentAvailable({
        space: 'cdf_cdm',
        externalId: 'F2',
        isUploaded: true,
      }),
    ).toBe(true);
    expect(
      isDocumentContentAvailable({
        space: 'cdf_cdm',
        externalId: 'F3',
      }),
    ).toBe(true);
  });

  it('falls back to the raw MIME type, then to a placeholder label', () => {
    expect(getDocumentTypeLabel(makeDocument({ mimeType: 'application/x-dwg' }))).toBe(
      'application/x-dwg',
    );
    expect(getDocumentTypeLabel(makeDocument())).toBe('Unknown type');
    // The lookup is case-insensitive, so an upper-case MIME type still resolves to the label.
    expect(getDocumentTypeLabel(makeDocument({ mimeType: 'IMAGE/PNG' }))).toBe('PNG');
  });

  it('returns no timestamp when the document carries none', () => {
    expect(getDocumentTimestamp(makeDocument())).toBeUndefined();
    expect(getDocumentTimestampMs(makeDocument())).toBeUndefined();
    expect(getDocumentTimestampMs(makeDocument({ uploadedTime: 55 }))).toBe(55);
  });

  it('sorts by recency, keeps undated documents last and breaks ties on externalId', () => {
    const newest = makeDocument({ externalId: 'newest', sourceUpdatedTime: 500 });
    const older = makeDocument({ externalId: 'older', uploadedTime: 100 });
    const undatedA = makeDocument({ externalId: 'a-undated' });
    const undatedB = makeDocument({ externalId: 'b-undated' });

    expect(
      sortDocumentsByRecency([undatedB, older, undatedA, newest]).map((item) => item.externalId),
    ).toEqual(['newest', 'older', 'a-undated', 'b-undated']);

    expect(compareDocumentsByRecency(undatedA, newest)).toBe(1);
    expect(compareDocumentsByRecency(newest, undatedA)).toBe(-1);
    expect(compareDocumentsByRecency(undatedA, undatedB)).toBeLessThan(0);
    expect(
      compareDocumentsByRecency(
        makeDocument({ externalId: 'b', uploadedTime: 100 }),
        makeDocument({ externalId: 'a', uploadedTime: 100 }),
      ),
    ).toBeGreaterThan(0);
  });

  it('builds a stable document ref key', () => {
    expect(documentRefKey({ space: CDF_CDM_SPACE, externalId: 'FILE-9' })).toBe(
      `${CDF_CDM_SPACE}:FILE-9`,
    );
  });
});

describe(mapNodeToDocumentSummary.name, () => {
  it('maps every CogniteFile property the panel and preview consume', () => {
    const summary = mapNodeToDocumentSummary(
      makeNode({
        name: 'Manual.pdf',
        description: 'Operating manual',
        tags: ['manual'],
        aliases: ['P&ID'],
        sourceId: 'SP-1',
        sourceContext: 'SharePoint',
        source: 'SharePoint',
        sourceCreatedTime: 1_600_000_000_000,
        sourceUpdatedTime: 1_650_000_000_000,
        sourceCreatedUser: 'author',
        sourceUpdatedUser: 'editor',
        mimeType: 'application/pdf',
        directory: '/manuals',
        isUploaded: true,
        uploadedTime: 1_640_000_000_000,
      }),
    );

    expect(summary).toEqual({
      space: CDF_CDM_SPACE,
      externalId: 'FILE-1',
      name: 'Manual.pdf',
      description: 'Operating manual',
      tags: ['manual'],
      aliases: ['P&ID'],
      sourceId: 'SP-1',
      sourceContext: 'SharePoint',
      source: 'SharePoint',
      sourceCreatedTime: 1_600_000_000_000,
      sourceUpdatedTime: 1_650_000_000_000,
      sourceCreatedUser: 'author',
      sourceUpdatedUser: 'editor',
      mimeType: 'application/pdf',
      directory: '/manuals',
      isUploaded: true,
      uploadedTime: 1_640_000_000_000,
      lastUpdatedTime: 1_700_000_000_000,
    });
  });

  it('treats empty strings and non-string values as absent', () => {
    const summary = mapNodeToDocumentSummary(
      makeNode({ name: '', mimeType: 7, directory: null, sourceId: {} }),
    );

    expect(summary.name).toBeUndefined();
    expect(summary.mimeType).toBeUndefined();
    expect(summary.directory).toBeUndefined();
    expect(summary.sourceId).toBeUndefined();
  });

  it('reads isUploaded only when it is a real boolean', () => {
    expect(mapNodeToDocumentSummary(makeNode({ isUploaded: false })).isUploaded).toBe(false);
    expect(mapNodeToDocumentSummary(makeNode({ isUploaded: 'true' })).isUploaded).toBeUndefined();
    expect(mapNodeToDocumentSummary(makeNode({})).isUploaded).toBeUndefined();
  });

  it('accepts Date, epoch-number and ISO-string timestamps and rejects unparseable ones', () => {
    expect(
      mapNodeToDocumentSummary(makeNode({ uploadedTime: new Date(1_640_000_000_000) })).uploadedTime,
    ).toBe(1_640_000_000_000);
    expect(mapNodeToDocumentSummary(makeNode({ uploadedTime: 1_640_000_000_000 })).uploadedTime).toBe(
      1_640_000_000_000,
    );
    expect(
      mapNodeToDocumentSummary(makeNode({ uploadedTime: '2021-12-20T00:00:00.000Z' })).uploadedTime,
    ).toBe(Date.parse('2021-12-20T00:00:00.000Z'));
    expect(mapNodeToDocumentSummary(makeNode({ uploadedTime: 'nope' })).uploadedTime).toBeUndefined();
    expect(
      mapNodeToDocumentSummary(makeNode({ uploadedTime: new Date('nope') })).uploadedTime,
    ).toBeUndefined();
    expect(mapNodeToDocumentSummary(makeNode({ uploadedTime: Number.NaN })).uploadedTime).toBeUndefined();
    expect(mapNodeToDocumentSummary(makeNode({ uploadedTime: '' })).uploadedTime).toBeUndefined();
    expect(mapNodeToDocumentSummary(makeNode({ uploadedTime: false })).uploadedTime).toBeUndefined();
  });

  it('keeps only non-empty strings in list properties and drops empty lists', () => {
    const summary = mapNodeToDocumentSummary(makeNode({ tags: ['keep', '', 3], aliases: [] }));

    expect(summary.tags).toEqual(['keep']);
    expect(summary.aliases).toBeUndefined();
    expect(mapNodeToDocumentSummary(makeNode({ tags: 'manual' })).tags).toBeUndefined();
    expect(mapNodeToDocumentSummary(makeNode({ tags: [null] })).tags).toBeUndefined();
  });

  it('degrades to node identity when the view properties are missing or malformed', () => {
    expect(
      mapNodeToDocumentSummary(makeNode(undefined, { properties: undefined })),
    ).toMatchObject({ space: CDF_CDM_SPACE, externalId: 'FILE-1', name: undefined });
    expect(
      mapNodeToDocumentSummary(
        makeNode(undefined, {
          properties: { [CDF_CDM_SPACE]: 'unexpected' } as unknown as NodeDefinition['properties'],
        }),
      ).name,
    ).toBeUndefined();
    expect(mapNodeToDocumentSummary(makeNode('unexpected')).name).toBeUndefined();
    expect(mapNodeToDocumentSummary(makeNode(null)).name).toBeUndefined();
  });
});
