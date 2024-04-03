import { Dispatch, useCallback, useEffect } from 'react';
import { hashCode } from '../../helpers/hashCode';
import { ImageContextAction } from '../image.context';
import { NudityResponse } from '../types';

type UseFilterAndSortParams = {
  browsingDir: string;
  nudityMap: Map<string, NudityResponse>;
  favorites: string[];
};

export const useElectronFileSystem = (
  { browsingDir, nudityMap, favorites }: UseFilterAndSortParams,
  dispatch: Dispatch<ImageContextAction>
) => {
  const storeNudityMap = useCallback(
    (_nudityMap: Map<string, NudityResponse>) => {
      const serialize = {};
      for (const [key, value] of _nudityMap.entries()) {
        if (value && typeof value !== 'string') {
          serialize[key] = value;
        }
      }
      console.log('Save new nudityMap: ', Object.keys(serialize).length);

      // @ts-expect-error bla
      window.electron
        .storeData(
          `${hashCode(browsingDir)}_nudity.json`,
          JSON.stringify(serialize)
        )
        .then((results) => {
          console.log('🍆 Stored nudity data', { results });
        });
    },
    [browsingDir]
  );
  useEffect(() => {
    if (browsingDir && nudityMap.size > 0) {
      storeNudityMap(nudityMap);
    }
  }, [browsingDir, nudityMap, storeNudityMap]);

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

  // Restore possible existing nudityMap
  useEffect(() => {
    if (browsingDir) {
      // @ts-expect-error bla
      window.electron
        .getData(`${hashCode(browsingDir)}_nudity.json`)
        .then((nudityMapStr) => {
          if (nudityMapStr) {
            const newNudityMap = new Map<string, NudityResponse>(
              Object.entries(JSON.parse(nudityMapStr))
            );
            console.log('✅ Nudity map restored!', { newNudityMap });
            dispatch({ type: 'SET_NUDITY_MAP', payload: newNudityMap });
          }
        });
    }
  }, [browsingDir, dispatch]);
};
