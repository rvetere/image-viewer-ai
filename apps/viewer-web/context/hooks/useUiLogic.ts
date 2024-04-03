import * as nsfwjs from 'nsfwjs';
import { Dispatch, useCallback, useEffect } from 'react';
import { IImageContext, ImageContextAction } from '../image.context';
import { ImageWithDefinitions, NudityResponse } from '../types';
import { useElectronFileSystem } from './useElectronFileSystem';

export const useUiLogic = (
  { browsingDir, nudityMap, favorites, uiState, images }: IImageContext,
  dispatch: Dispatch<ImageContextAction>
) => {
  useElectronFileSystem({ browsingDir, favorites, nudityMap }, dispatch);

  // Load the NSFW model
  useEffect(() => {
    nsfwjs
      .load()
      .then((_model) => dispatch({ type: 'SET_MODEL', payload: _model }));
  }, [dispatch]);

  const { filterFn, sortWithFilterFn } = useFilterAndSort({
    nudityMap,
    favorites,
    uiState,
    dispatch,
  });

  const { filter } = uiState;
  useEffect(() => {
    const newList: ImageWithDefinitions[] = images
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
    dispatch({ type: 'SET_LIST', payload: newList });
  }, [
    filter,
    uiState.format,
    images,
    uiState.onlyFaves,
    dispatch,
    filterFn,
    sortWithFilterFn,
  ]);
};

type UseFilterAndSortParams = {
  nudityMap: Map<string, NudityResponse>;
  favorites: string[];
  uiState: IImageContext['uiState'];
  dispatch: Dispatch<ImageContextAction>;
};

const useFilterAndSort = ({
  nudityMap,
  favorites,
  uiState: { filter, format, onlyFaves },
  dispatch,
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
    (search, isSexy, neutral) => (image) => {
      const nudity = nudityMap.get(
        image.resizedDataUrl ? image.resizedDataUrl : image.src
      );
      if (nudity) {
        const check =
          nudity.output &&
          nudity.output.detections.find((d) =>
            d.name.toLowerCase().includes(search)
          );
        return (
          isSexy &&
          neutral.probability < 0.3 &&
          check &&
          parseFloat(check.confidence) > 0.67 &&
          filterFormat(image)
        );
      }
      return false;
    },
    [filterFormat, nudityMap]
  );

  const filterFn = useCallback(
    (image) => {
      dispatch({ type: 'RESET_SELECTED' });
      const withOnlyFave = onlyFaves ? favorites.includes(image.src) : true;
      const neutral = image.predictions.find((p) => p.className === 'Neutral');
      const sexy = image.predictions.find((p) => p.className === 'Sexy');
      const hentai = image.predictions.find((p) => p.className === 'Hentai');
      const porn = image.predictions.find((p) => p.className === 'Porn');
      const isSexy =
        (sexy && sexy.probability >= 0.4) ||
        (hentai && hentai.probability >= 0.4) ||
        (porn && porn.probability >= 0.4);

      if (filter === 'all') {
        return true && filterFormat(image) && withOnlyFave;
      } else if (filter === 'buttocksOnly') {
        return filterNudity('buttocks', isSexy, neutral)(image) && withOnlyFave;
      } else if (filter === 'breastsOnly') {
        return filterNudity('breast', isSexy, neutral)(image) && withOnlyFave;
      } else if (filter === 'sexyOnly') {
        return (
          isSexy &&
          neutral.probability < 0.3 &&
          filterFormat(image) &&
          withOnlyFave
        );
      } else {
        // word filter
        const nudity = nudityMap.get(
          image.resizedDataUrl ? image.resizedDataUrl : image.src
        );
        if (nudity) {
          const check =
            nudity.output &&
            nudity.output.detections.find((d) => d.name.includes(filter));
          return (
            isSexy &&
            neutral.probability < 0.3 &&
            check &&
            parseFloat(check.confidence) > 0.67 &&
            filterFormat(image) &&
            withOnlyFave
          );
        }
        return false;
      }
    },
    [
      filter,
      onlyFaves,
      favorites,
      nudityMap,
      dispatch,
      filterNudity,
      filterFormat,
    ]
  );

  const sortWithFilterFn = useCallback(
    (search: string) => (a: ImageWithDefinitions, b: ImageWithDefinitions) => {
      const aNudity = nudityMap.get(
        a.resizedDataUrl ? a.resizedDataUrl : a.src
      );
      const bNudity = nudityMap.get(
        b.resizedDataUrl ? b.resizedDataUrl : b.src
      );
      if (aNudity && bNudity) {
        const aCheck = aNudity.output.detections.find((d) =>
          d.name.toLowerCase().includes(search)
        );
        const bCheck = bNudity.output.detections.find((d) =>
          d.name.toLowerCase().includes(search)
        );
        if (aCheck && bCheck) {
          return parseFloat(bCheck.confidence) - parseFloat(aCheck.confidence);
        }
      }
    },
    [nudityMap]
  );

  return { filterFn, sortWithFilterFn };
};
