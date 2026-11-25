/** Shares the model catalogue, pipeline operations and runtime info across pages. */
import { createContext, useContext } from 'react';
import { useModels } from '../hooks/useModels.js';

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const catalog = useModels();
  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('useCatalog must be used inside <CatalogProvider>');
  return value;
}
