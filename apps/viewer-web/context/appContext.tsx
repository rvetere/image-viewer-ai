import * as nsfwjs from 'nsfwjs';
import type { FunctionComponent, MouseEvent, ReactNode } from 'react';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import { ImageWithDefinitions, NudityResponse } from '../lib/types';
import { useElectronFileSystem } from '../hooks/useElectronFileSystem';
import { hashCode } from '../lib/hashCode';
import { getImageDef } from '../lib/getImageDef';
import { storeDataOnFileSystem } from '../lib/storeDataOnFileSystem';

export interface IAppContext {
  working: boolean;
  progress: number;
  selected: string[];
  subSelected: string[];
  selectStartIndex: number;
  model: nsfwjs.NSFWJS;
  browsingDir: string | null;
  originalData: ImageWithDefinitions[];
  browsingData: ImageWithDefinitions[];
  nudityMap: Map<string, NudityResponse>;
  favorites: string[];
}

export interface IAppOperationsContext {
  setWorking: (working: boolean) => void;
  setBrowsingData: (browsingData: ImageWithDefinitions[]) => void;
  setFavorites: (favorites: string[]) => void;
  setNudityMap: (nudityMap: Map<string, NudityResponse>) => void;
  resetSelected: () => void;
  setSelected: (selected: string[]) => void;
  setSubSelected: (subSelected: string[]) => void;
  handleSelect: (
    index: number
  ) => (event: MouseEvent<HTMLImageElement>) => void;
  handleFavorite: (
    image: ImageWithDefinitions
  ) => (event: MouseEvent<HTMLButtonElement>) => void;
  handleBrowse: () => void;
  handleReset: () => void;
}

export type AppContextAction =
  | { type: 'SET_WORKING'; payload: boolean }
  | { type: 'SET_MODEL'; payload: nsfwjs.NSFWJS }
  | { type: 'SET_NUDITY_MAP'; payload: Map<string, NudityResponse> }
  | { type: 'SET_BROWSING_DATA'; payload: ImageWithDefinitions[] }
  | { type: 'BROWSE'; payload: { dir: string; imagePaths: string[] } }
  | { type: 'SET_FAVORITES'; payload: string[] }
  | { type: 'SET_PROGRESS'; payload: number }
  | { type: 'SET_SELECTED'; payload: string[] }
  | { type: 'SET_SUB_SELECTED'; payload: string[] }
  | { type: 'SET_SEL_START_INDEX'; payload: number }
  | { type: 'RESET_SELECTED' }
  | { type: 'RESET' };

const initialState: IAppContext = {
  working: false,
  model: {} as nsfwjs.NSFWJS,
  browsingDir: null,
  originalData: [],
  browsingData: [],
  nudityMap: new Map<string, NudityResponse>(),
  favorites: [],
  progress: 0,
  selected: [],
  subSelected: [],
  selectStartIndex: -1,
};

function appContextReducer(
  state: IAppContext,
  action: AppContextAction
): IAppContext {
  switch (action.type) {
    case 'RESET':
      return initialState;
    case 'RESET_SELECTED': {
      return {
        ...state,
        selected: [],
        subSelected: [],
        selectStartIndex: -1,
      };
    }
    case 'SET_SELECTED':
      return {
        ...state,
        selected: action.payload,
      };
    case 'SET_SUB_SELECTED':
      return {
        ...state,
        subSelected: action.payload,
      };
    case 'SET_SEL_START_INDEX':
      return {
        ...state,
        selectStartIndex: action.payload,
      };
    case 'BROWSE': {
      const newState: IAppContext = {
        ...initialState, // reset state on every new browse action
        browsingDir: action.payload.dir,
      };
      return newState;
    }
    case 'SET_WORKING': {
      return {
        ...state,
        working: action.payload,
      };
    }
    case 'SET_BROWSING_DATA': {
      if (state.originalData.length === 0 && action.payload.length > 0) {
        return {
          ...state,
          originalData: action.payload,
          browsingData: action.payload,
          selected: [],
          subSelected: [],
          selectStartIndex: -1,
        };
      }
      const newState: IAppContext = {
        ...state,
        browsingData: action.payload,
        selected: [],
        subSelected: [],
        selectStartIndex: -1,
      };
      return newState;
    }
    case 'SET_FAVORITES': {
      const newState: IAppContext = {
        ...state,
        favorites: action.payload,
      };
      return newState;
    }
    case 'SET_MODEL': {
      const newState: IAppContext = { ...state, model: action.payload };
      return newState;
    }
    case 'SET_NUDITY_MAP': {
      const newState: IAppContext = { ...state, nudityMap: action.payload };
      return newState;
    }
    case 'SET_PROGRESS': {
      return { ...state, progress: action.payload };
    }
    default:
      throw new Error(`Unhandled action type: ${action}`);
  }
}

const AppContext = createContext<IAppContext | undefined | null>(null);

const AppOperationsContext = createContext<IAppOperationsContext | null>(null);

export const AppContextProvider: FunctionComponent<{
  children: ReactNode;
}> = ({ children }) => {
  const [state, dispatch] = useReducer(appContextReducer, initialState);

  useElectronFileSystem(state, dispatch);

  // Load the NSFW model
  useEffect(() => {
    nsfwjs
      .load()
      .then((_model) => dispatch({ type: 'SET_MODEL', payload: _model }));
  }, [dispatch]);

  const { model, browsingData, favorites, selectStartIndex } = state;

  const operations = useMemo(
    () => ({
      handleReset: () => {
        dispatch({ type: 'RESET' });
      },
      resetSelected: () => {
        dispatch({ type: 'RESET_SELECTED' });
      },
      setSelected: (selected: string[]) =>
        dispatch({ type: 'SET_SELECTED', payload: selected }),
      setSubSelected: (subSelected: string[]) =>
        dispatch({ type: 'SET_SUB_SELECTED', payload: subSelected }),
      handleSelect:
        (index: number) => (event: MouseEvent<HTMLImageElement>) => {
          if (selectStartIndex === -1) {
            dispatch({
              type: 'SET_SEL_START_INDEX',
              payload: index,
            });
          } else if (event.shiftKey) {
            const newSelected = browsingData
              .filter((_image, idx) => idx >= selectStartIndex && idx <= index)
              .map((image) => image.src);
            dispatch({
              type: 'SET_SELECTED',
              payload: newSelected,
            });
          }
        },
      setWorking: (working: boolean) =>
        dispatch({ type: 'SET_WORKING', payload: working }),
      setBrowsingData: (browsingData: ImageWithDefinitions[]) =>
        dispatch({ type: 'SET_BROWSING_DATA', payload: browsingData }),
      setNudityMap: (nudityMap: Map<string, NudityResponse>) =>
        dispatch({ type: 'SET_NUDITY_MAP', payload: nudityMap }),
      setFavorites: (favorites: string[]) =>
        dispatch({ type: 'SET_FAVORITES', payload: favorites }),
      handleBrowse: () => {
        dispatch({ type: 'SET_WORKING', payload: true });
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

          console.log('✅ Got all image defs..', { imagesWithDefsFinal, dir });
          if (imagesWithDefsFinal.length > 0) {
            dispatch({
              type: 'SET_BROWSING_DATA',
              payload: imagesWithDefsFinal,
            });
            storeDataOnFileSystem(
              `${hashCode(dir)}.json`,
              JSON.stringify(imagesWithDefsFinal)
            );
          }
          dispatch({ type: 'SET_WORKING', payload: false });
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
    }),
    [favorites, model, browsingData, selectStartIndex]
  );

  return (
    <AppContext.Provider value={state}>
      <AppOperationsContext.Provider value={operations}>
        {children}
      </AppOperationsContext.Provider>
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);

  if (context === null) {
    throw new Error('Must be within AppContextProvider');
  }

  return context;
};

export const useAppOperations = () => {
  const context = useContext(AppOperationsContext);

  if (!context) {
    throw new Error('Must be within AppContextProvider');
  }

  return context;
};
