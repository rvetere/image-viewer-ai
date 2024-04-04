import { Dispatch, useCallback, useEffect } from 'react';
import { AppContextAction } from '../context/appContext';
import { hashCode } from '../lib/hashCode';
import { NudityResponse } from '../lib/types';

type UseFilterAndSortParams = {
  browsingDir: string;
  favorites: string[];
};

export const useElectronFileSystem = (
  { browsingDir, favorites }: UseFilterAndSortParams,
  dispatch: Dispatch<AppContextAction>
) => {
  useEffect(() => {
    if (favorites.length > 0) {
      // window.electron
      //   .storeData(`favorites.json`, JSON.stringify(favorites))
      //   .then((results) => {
      //     console.log('✅ Stored favorites data', { results });
      //   });
    }
  }, [favorites]);

  // Restore possible existing favorites
  // window.electron.getData(`favorites.json`).then((favoritesStr) => {
  //   if (favoritesStr) {
  //     const favorites = JSON.parse(favoritesStr);
  //     dispatch({ type: 'SET_FAVORITES', payload: favorites });
  //   }
  // });
};
