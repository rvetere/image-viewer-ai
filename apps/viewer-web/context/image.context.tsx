import * as nsfwjs from 'nsfwjs';
import type { FunctionComponent, MouseEvent, ReactNode } from 'react';
import { createContext, useContext, useMemo, useReducer } from 'react';
import { getImageDef } from '../helpers/getImageDef';
import { hashCode } from '../helpers/hashCode';
import { storeDataOnFileSystem } from '../helpers/storeDataOnFileSystem';
import { useUiLogic } from './hooks/useUiLogic';
import {
  ImageFilter,
  ImageFormat,
  ImageWithDefinitions,
  NudityResponse,
} from './types';

export interface IImageContext {
  model: nsfwjs.NSFWJS;
  browsingDir: string | null;
  list: ImageWithDefinitions[];
  nudityMap: Map<string, NudityResponse>;
  images: ImageWithDefinitions[];
  favorites: string[];
  uiState: {
    working: boolean;
    progress: number;
    selected: string[];
    subSelected: string[];
    selectStartIndex: number;
    filter: ImageFilter;
    format: ImageFormat;
    onlyFaves: boolean;
    showBoundingBox: boolean;
  };
}

export interface IImageOperationsContext {
  setFilter: (filter: ImageFilter) => void;
  setFormat: (filter: ImageFormat) => void;
  setOnlyFaves: (onlyFaves: boolean) => void;
  setShowBoundingBox: (showBoundingBox: boolean) => void;
  setWorking: (working: boolean) => void;
  setFavorites: (favorites: string[]) => void;
  setSelected: (selected: string[]) => void;
  setSubSelected: (subSelected: string[]) => void;
  setNudityMap: (nudityMap: Map<string, NudityResponse>) => void;
  setImages: (images: ImageWithDefinitions[]) => void;
  handleFavorite: (
    image: ImageWithDefinitions
  ) => (event: MouseEvent<HTMLButtonElement>) => void;
  handleSelect: (
    index: number
  ) => (event: MouseEvent<HTMLImageElement>) => void;
  handleBrowse: () => void;
  handleReset: () => void;
}

export type ImageContextAction =
  | { type: 'SET_MODEL'; payload: nsfwjs.NSFWJS }
  | { type: 'SET_NUDITY_MAP'; payload: Map<string, NudityResponse> }
  | { type: 'SET_PROGRESS'; payload: number }
  | { type: 'SET_IMAGES'; payload: ImageWithDefinitions[] }
  | { type: 'SET_LIST'; payload: ImageWithDefinitions[] }
  | { type: 'BROWSE'; payload: { dir: string; imagePaths: string[] } }
  | { type: 'SET_UI_STATE'; payload: Partial<IImageContext['uiState']> }
  | { type: 'SET_FAVORITES'; payload: string[] }
  | { type: 'RESET_SELECTED' }
  | { type: 'RESET' };

const initialState: IImageContext = {
  model: {} as nsfwjs.NSFWJS,
  browsingDir: null,
  list: [],
  nudityMap: new Map<string, NudityResponse>(),
  images: [],
  favorites: [],
  uiState: {
    working: false,
    progress: 0,
    selected: [],
    subSelected: [],
    selectStartIndex: -1,
    filter: 'sexyOnly',
    format: 'all',
    onlyFaves: false,
    showBoundingBox: false,
  },
};

function imageContextReducer(
  state: IImageContext,
  action: ImageContextAction
): IImageContext {
  switch (action.type) {
    case 'RESET':
      return initialState;
    case 'BROWSE': {
      const newState: IImageContext = {
        ...initialState, // reset state on every new browse action
        browsingDir: action.payload.dir,
      };
      return newState;
    }
    case 'SET_UI_STATE': {
      const newState: IImageContext = {
        ...state,
        uiState: { ...state.uiState, ...action.payload },
      };
      return newState;
    }
    case 'SET_IMAGES': {
      const newState: IImageContext = {
        ...state,
        uiState: { ...state.uiState, working: false, progress: 0 },
        images: action.payload,
      };
      return newState;
    }
    case 'SET_LIST': {
      const newState: IImageContext = {
        ...state,
        list: action.payload,
      };
      return newState;
    }
    case 'SET_FAVORITES': {
      const newState: IImageContext = {
        ...state,
        favorites: action.payload,
      };
      return newState;
    }
    case 'SET_MODEL': {
      const newState: IImageContext = { ...state, model: action.payload };
      return newState;
    }
    case 'SET_NUDITY_MAP': {
      const newState: IImageContext = { ...state, nudityMap: action.payload };
      return newState;
    }
    case 'SET_PROGRESS': {
      const newState: IImageContext = {
        ...state,
        uiState: { ...state.uiState, progress: action.payload },
      };
      return newState;
    }
    case 'RESET_SELECTED': {
      const newState: IImageContext = {
        ...state,
        uiState: { ...state.uiState, selected: [], subSelected: [] },
      };
      return newState;
    }
    default:
      throw new Error(`Unhandled action type: ${action}`);
  }
}

const ImageContext = createContext<IImageContext | undefined | null>(null);

const ImageOperationsContext = createContext<IImageOperationsContext | null>(
  null
);

export const ImageContextProvider: FunctionComponent<{
  children: ReactNode;
}> = ({ children }) => {
  const [state, dispatch] = useReducer(imageContextReducer, initialState);

  useUiLogic(state, dispatch);

  const {
    model,
    list,
    favorites,
    uiState: { selectStartIndex },
  } = state;
  const operations = useMemo(
    () => ({
      handleReset: () => dispatch({ type: 'RESET' }),
      setOnlyFaves: (onlyFaves: boolean) =>
        dispatch({ type: 'SET_UI_STATE', payload: { onlyFaves } }),
      setShowBoundingBox: (showBoundingBox: boolean) =>
        dispatch({ type: 'SET_UI_STATE', payload: { showBoundingBox } }),
      setFilter: (filter: ImageFilter) =>
        dispatch({ type: 'SET_UI_STATE', payload: { filter } }),
      setFormat: (format: ImageFormat) =>
        dispatch({ type: 'SET_UI_STATE', payload: { format } }),
      setWorking: (working: boolean) =>
        dispatch({ type: 'SET_UI_STATE', payload: { working } }),
      setSelected: (selected: string[]) =>
        dispatch({ type: 'SET_UI_STATE', payload: { selected } }),
      setSubSelected: (subSelected: string[]) =>
        dispatch({ type: 'SET_UI_STATE', payload: { subSelected } }),
      setNudityMap: (nudityMap: Map<string, NudityResponse>) =>
        dispatch({ type: 'SET_NUDITY_MAP', payload: nudityMap }),
      setImages: (images: ImageWithDefinitions[]) =>
        dispatch({ type: 'SET_IMAGES', payload: images }),
      setFavorites: (favorites: string[]) =>
        dispatch({ type: 'SET_FAVORITES', payload: favorites }),
      handleBrowse: () => {
        dispatch({ type: 'SET_UI_STATE', payload: { working: true } });
        console.log('🚀 Browsing..');
        // @ts-expect-error bla
        window.electron.browse().then(async ([dir, imagePaths]) => {
          console.log('🚀 Got dir and imagePaths..', { dir, imagePaths });

          console.log('🐌 Loading existing images defs..');
          // @ts-expect-error bla
          const existing = await window.electron.getData(
            `${hashCode(dir)}.json`
          );
          let existingDefs = existing ? JSON.parse(existing) : [];
          if (existingDefs.length > imagePaths.length) {
            existingDefs = existingDefs.filter((existing) =>
              imagePaths.map((i) => i.src).includes(existing.src)
            );
          }
          let imagesWithDefsFinal = existingDefs.map((existing) => {
            const image = imagePaths.find((i) => i.src === existing.src);
            if (image && image.resizedDataUrl && !existing.resizedDataUrl) {
              const maxWidth = 600;
              const height = Math.round(
                (existing.size.height / existing.size.width) * maxWidth
              );
              return {
                ...existing,
                size: {
                  width: maxWidth,
                  height,
                },
                resizedDataUrl: image.resizedDataUrl,
              };
            }
            return existing;
          });

          const notFetched = imagePaths.filter(
            (imagePath) =>
              !existingDefs.find((def) => def.src === imagePath.src)
          );
          const promises = notFetched.map(async (imagePath) => {
            const imageDefs = await getImageDef(imagePath, model);
            return imageDefs;
          });

          const imageDefs = await Promise.all(promises);

          const imagesWithDefs = notFetched.map((imagePath, index) => {
            const defs = imageDefs[index];
            return {
              src: imagePath.src,
              resizedDataUrl: imagePath.resizedDataUrl,
              size: imagePath.size,
              ...defs,
            };
          });

          imagesWithDefsFinal = [...imagesWithDefsFinal, ...imagesWithDefs];

          console.log('✅ Got all image defs..', { imageDefs, dir });
          if (imagesWithDefsFinal.length > 0) {
            dispatch({ type: 'SET_IMAGES', payload: imagesWithDefsFinal });
            storeDataOnFileSystem(
              `${hashCode(dir)}.json`,
              JSON.stringify(imagesWithDefsFinal)
            );
          } else {
            dispatch({ type: 'SET_UI_STATE', payload: { working: false } });
          }
        });
      },
      handleFavorite:
        (image: ImageWithDefinitions) =>
        (_event: MouseEvent<HTMLButtonElement>) => {
          const exists = favorites.includes(image.src);
          if (exists) {
            const newFavorites = favorites.filter((src) => src !== image.src);
            dispatch({ type: 'SET_FAVORITES', payload: newFavorites });
          } else {
            const newFavorites = [...favorites, image.src];
            dispatch({ type: 'SET_FAVORITES', payload: newFavorites });
          }
        },
      handleSelect:
        (index: number) => (event: MouseEvent<HTMLImageElement>) => {
          if (selectStartIndex === -1) {
            dispatch({
              type: 'SET_UI_STATE',
              payload: { selectStartIndex: index },
            });
          } else if (event.shiftKey) {
            const newSelected = list
              .filter((_image, idx) => idx >= selectStartIndex && idx <= index)
              .map((image) => image.src);
            dispatch({
              type: 'SET_UI_STATE',
              payload: { selected: newSelected },
            });
          }
        },
    }),
    [model, list, selectStartIndex, favorites]
  );

  return (
    <ImageContext.Provider value={state}>
      <ImageOperationsContext.Provider value={operations}>
        {children}
      </ImageOperationsContext.Provider>
    </ImageContext.Provider>
  );
};

export const useImageContext = () => {
  const context = useContext(ImageContext);

  if (context === null) {
    throw new Error('Must be within ImageContextProvider');
  }

  return context;
};

export const useImageOperations = () => {
  const context = useContext(ImageOperationsContext);

  if (!context) {
    throw new Error('Must be within ImageContextProvider');
  }

  return context;
};
