import type { FunctionComponent, MouseEvent, ReactNode } from 'react';
import { createContext, useContext, useMemo, useReducer } from 'react';
import { useElectronFileSystem } from '../hooks/useElectronFileSystem';
import { hashCode } from '../lib/hashCode';
import { loadDataFromFileSystem } from '../lib/loadDataFromFileSystem';
import { storeDataOnFileSystem } from '../lib/storeDataOnFileSystem';
import { ImageWithDefinitions } from '../lib/types';

export interface IAppContext {
  working: boolean;
  progress: number;
  selected: string[];
  subSelected: string[];
  selectStartIndex: number;
  browsingDir: string | null;
  originalData: ImageWithDefinitions[];
  browsingData: ImageWithDefinitions[];
  favorites: string[];
}

export interface IAppOperationsContext {
  setWorking: (working: boolean) => void;
  setBrowsingData: (browsingData: ImageWithDefinitions[]) => void;
  setFavorites: (favorites: string[]) => void;
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
  browsingDir: null,
  originalData: [],
  browsingData: [],
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
          working: false,
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

  const { browsingData, favorites, selectStartIndex } = state;

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
      setFavorites: (favorites: string[]) =>
        dispatch({ type: 'SET_FAVORITES', payload: favorites }),
      handleBrowse: () => {
        dispatch({ type: 'SET_WORKING', payload: true });
        console.log('🚀 Browse folder..');
        // @ts-expect-error bla
        window.electron.browse().then(
          async ([dir, imagePaths, appDataPath]: [
            dir: string,
            appDataPath: string,
            imagePaths: {
              src: string;
              size: {
                width: number;
                height: number;
              };
              resizedDataUrl?: string;
            }[]
          ]) => {
            const dataFilePath = `${hashCode(dir)}.json`;
            console.log('✅ All images in folder successfully prepared..', {
              dir,
              len: imagePaths.length,
            });
            const existing = await loadDataFromFileSystem(dataFilePath);
            const existingDefs = (existing ?? []) as ImageWithDefinitions[];

            console.log('🚀 Classify images now, multi-threaded..');
            // @ts-expect-error bla
            window.electron
              .classifyImages(imagePaths, existingDefs)
              .then((classifiedImages) => {
                console.log('✅ Got all image defs..', {
                  classifiedImages,
                });
                dispatch({
                  type: 'SET_BROWSING_DATA',
                  payload: classifiedImages,
                });
                storeDataOnFileSystem(
                  dataFilePath,
                  JSON.stringify(classifiedImages)
                );
              });
          }
        );
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
    [browsingData, favorites, selectStartIndex]
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
