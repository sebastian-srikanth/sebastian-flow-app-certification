import type { ReactNode } from 'react';

import type { DocumentService } from '../services/DocumentService';

import { DocumentServiceContext } from './documentServiceContext';

type DocumentServiceProviderProps = {
  documentService: DocumentService;
  children: ReactNode;
};

export function DocumentServiceProvider({
  documentService,
  children,
}: DocumentServiceProviderProps) {
  return (
    <DocumentServiceContext.Provider value={{ documentService }}>
      {children}
    </DocumentServiceContext.Provider>
  );
}
