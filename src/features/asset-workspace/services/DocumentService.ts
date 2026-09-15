import type { DocumentListPage, DocumentRef } from '../documents/types';
import type { AssetRef } from '../types';

export type DocumentService = {
  listRelatedDocuments: (asset: AssetRef, cursor?: string) => Promise<DocumentListPage>;
  getDownloadUrl: (ref: DocumentRef) => Promise<string>;
};
