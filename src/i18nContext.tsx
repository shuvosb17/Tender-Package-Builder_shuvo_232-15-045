import { createContext, useContext } from 'react';
import { dictionaries, type Dict, type Lang } from './i18n';

export const I18nContext = createContext<{ lang: Lang; t: Dict }>({ lang: 'en', t: dictionaries.en });

export function useI18n() {
  return useContext(I18nContext);
}
