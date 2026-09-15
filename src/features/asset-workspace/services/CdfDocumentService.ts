import type { CogniteClient, NodeDefinition } from '@cognite/sdk';


import {
  COGNITE_FILE_VIEW,
  FILE_ASSETS_FILTER_PROPERTY,
  FILE_PAGE_SIZE,
} from '../documents/constants';
import { mapNodeToDocumentSummary } from '../documents/documentProperties';
import type { DocumentListPage, DocumentRef } from '../documents/types';
import type { AssetRef } from '../types';

import type { DocumentService } from './DocumentService';

import { cdfTaskRunner } from '@/lib/cdfTaskRunner';

function isNodeDefinition(item: unknown): item is NodeDefinition {
  if (typeof item !== 'object' || item === null) return false;
  const record = item as Record<string, unknown>;
  return record.instanceType === 'node';
}

export class CdfDocumentService implements DocumentService {
  constructor(private readonly client: CogniteClient) {}

  async listRelatedDocuments(asset: AssetRef, cursor?: string): Promise<DocumentListPage> {
    // No server-side `sort` here on purpose. The published core data model declares cursorable
    // indexes for `CogniteSchedulable`'s timestamps but none for `CogniteFile.uploadedTime` or
    // `CogniteSourceable.sourceUpdatedTime`, and DMS base properties other than space/externalId
    // are not indexed by default either. Sorting on any of them would trigger an in-memory
    // `sortNotBackedByIndex` sort that cannot be combined with pagination cursors.
    const response = await cdfTaskRunner.schedule(() =>
      this.client.instances.list({
        instanceType: 'node',
        sources: [{ source: COGNITE_FILE_VIEW }],
        filter: {
          containsAny: {
            property: [...FILE_ASSETS_FILTER_PROPERTY],
            values: [{ space: asset.space, externalId: asset.externalId }],
          },
        },
        limit: FILE_PAGE_SIZE,
        cursor,
      }),
    );

    const documents = response.items
      .filter(isNodeDefinition)
      .map(mapNodeToDocumentSummary);

    return {
      documents,
      nextCursor: response.nextCursor,
    };
  }

  async getDownloadUrl(ref: DocumentRef): Promise<string> {
    const links = await cdfTaskRunner.schedule(() =>
      this.client.files.getDownloadUrls([
        { instanceId: { space: ref.space, externalId: ref.externalId } },
      ]),
    );

    const downloadUrl = links[0]?.downloadUrl;
    if (!downloadUrl) {
      throw new Error('No download URL returned for this file.');
    }

    return downloadUrl;
  }
}
