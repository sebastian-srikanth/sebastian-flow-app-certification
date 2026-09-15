import { createContext, useContext } from 'react';

import type { DocumentService } from '../services/DocumentService';

export type DocumentServiceContextValue = {
  documentService: DocumentService;
};

export const DocumentServiceContext = createContext<DocumentServiceContextValue | null>(null);

export function useDocumentService(): DocumentService {
  const context = useContext(DocumentServiceContext);
  if (!context) {
    throw new Error('useDocumentService must be used within DocumentServiceProvider');
  }
  return context.documentService;
}
