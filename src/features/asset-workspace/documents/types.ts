export type DocumentRef = {
  space: string;
  externalId: string;
};

export type DocumentSummary = DocumentRef & {
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
  mimeType?: string;
  directory?: string;
  isUploaded?: boolean;
  uploadedTime?: number;
  lastUpdatedTime?: number;
};

export type DocumentListPage = {
  documents: DocumentSummary[];
  nextCursor?: string;
};
