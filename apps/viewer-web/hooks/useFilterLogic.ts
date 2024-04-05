import { Dispatch, useCallback, useEffect, useRef, useState } from 'react';
import { useAppContext, useAppOperations } from '../context/appContext';
import { FilterContextAction, IFilterContext } from '../context/filterContext';
import { ImageWithDefinitions } from '../lib/types';

export const useFilterLogic = (
  state: IFilterContext,
  dispatch: Dispatch<FilterContextAction>
) => {
  const { originalData, favorites } = useAppContext();
  const { setBrowsingData } = useAppOperations();

  const { filterFn, sortWithFilterFn } = useFilterAndSort({
    favorites,
    uiState: state,
  });

  const { filter, format } = state;
  const [lastFilter, setLastFilter] = useState(filter);
  const [lastData, setLastData] = useState(originalData);
  const [lastFormat, setLastFormat] = useState(format);
  const mountRef = useRef(false);
  useEffect(() => {
    if (
      !mountRef.current ||
      lastFilter !== filter ||
      lastData.length !== originalData.length ||
      lastFormat !== format
    ) {
      setLastFilter(filter);
      setLastData(originalData);
      setLastFormat(format);
      dispatch({ type: 'SET_STATE', payload: { filter } });
      const newData: ImageWithDefinitions[] = originalData
        .filter(filterFn)
        .sort((a, b) => {
          const sizeA = a.size.width * a.size.height;
          const sizeB = b.size.width * b.size.height;
          if (sizeA > sizeB) {
            return -1;
          } else if (sizeA < sizeB) {
            return 1;
          }
          return 0;
        })
        .sort((a, b) => {
          if (filter === 'buttocksOnly') {
            return sortWithFilterFn('buttocks')(a, b);
          } else if (filter === 'breastsOnly') {
            return sortWithFilterFn('breast')(a, b);
          } else if (filter !== 'all' && filter !== 'sexyOnly') {
            return sortWithFilterFn(filter)(a, b);
          }
          return 0;
        });
      setBrowsingData(newData);
    }
    mountRef.current = true;
  }, [
    originalData,
    filter,
    filterFn,
    sortWithFilterFn,
    dispatch,
    setBrowsingData,
    lastFilter,
    lastData,
    lastFormat,
    format,
  ]);
};

type UseFilterAndSortParams = {
  favorites: string[];
  uiState: IFilterContext;
};

const useFilterAndSort = ({
  favorites,
  uiState: { filter, format, onlyFaves },
}: UseFilterAndSortParams) => {
  const filterFormat = useCallback(
    (image) => {
      if (format === 'all') {
        return true;
      }
      const extension = image.src.split('.').pop();
      if (format === 'gifsOnly') {
        return extension === 'gif';
      } else if (format === 'staticOnly') {
        return extension !== 'gif';
      }
    },
    [format]
  );

  const filterNudity = useCallback(
    (search, isSexy) => (image: ImageWithDefinitions) => {
      if (image.nudenet?.parts.length > 0) {
        const check = image.nudenet?.parts.find((d) =>
          d.class.toLowerCase().includes(search)
        );
        return isSexy && check?.score > 0.67 && filterFormat(image);
      }
      return false;
    },
    [filterFormat]
  );

  const filterFn = useCallback(
    (image: ImageWithDefinitions) => {
      const withOnlyFave = onlyFaves ? favorites.includes(image.src) : true;
      const isSexy = image.nudenet?.sexy || image.nudenet?.nude;
      if (filter === 'all') {
        return true && filterFormat(image) && withOnlyFave;
      } else if (filter === 'buttocksOnly') {
        return filterNudity('buttocks', isSexy)(image) && withOnlyFave;
      } else if (filter === 'breastsOnly') {
        return filterNudity('breast', isSexy)(image) && withOnlyFave;
      } else if (filter === 'sexyOnly') {
        return isSexy && filterFormat(image) && withOnlyFave;
      } else {
        // word filter
        if (image.nudenet?.parts.length > 0) {
          const check = image.nudenet?.parts.find((d) =>
            d.class.includes(filter)
          );
          return (
            isSexy &&
            check &&
            check.score > 0.67 &&
            filterFormat(image) &&
            withOnlyFave
          );
        }
        return false;
      }
    },
    [filter, filterFormat, filterNudity, onlyFaves, favorites]
  );

  const sortWithFilterFn = useCallback(
    (search: string) => (a: ImageWithDefinitions, b: ImageWithDefinitions) => {
      const aCheck = a.nudenet?.parts.find((d) =>
        d.class.toLowerCase().includes(search)
      );
      const bCheck = b.nudenet?.parts.find((d) =>
        d.class.toLowerCase().includes(search)
      );
      if (aCheck && bCheck) {
        return bCheck.score - aCheck.score;
      }
    },
    []
  );

  return { filterFn, sortWithFilterFn };
};
