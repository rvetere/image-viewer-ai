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
  model: nsfwjs.NSFWJS;
  browsingDir: string | null;
  list: ImageWithDefinitions[];
  nudityMap: Map<string, NudityResponse>;
  images: ImageWithDefinitions[];
  favorites: string[];
}

export interface IAppOperationsContext {
  setWorking: (working: boolean) => void;
  setList: (list: ImageWithDefinitions[]) => void;
  setFavorites: (favorites: string[]) => void;
  setNudityMap: (nudityMap: Map<string, NudityResponse>) => void;
  setImages: (images: ImageWithDefinitions[]) => void;
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
  | { type: 'SET_IMAGES'; payload: ImageWithDefinitions[] }
  | { type: 'SET_LIST'; payload: ImageWithDefinitions[] }
  | { type: 'BROWSE'; payload: { dir: string; imagePaths: string[] } }
  | { type: 'SET_FAVORITES'; payload: string[] }
  | { type: 'RESET' };

const initialState: IAppContext = {
  working: false,
  model: {} as nsfwjs.NSFWJS,
  browsingDir: null,
  list: [],
  nudityMap: new Map<string, NudityResponse>(),
  images: [],
  favorites: [],
};

function appContextReducer(
  state: IAppContext,
  action: AppContextAction
): IAppContext {
  switch (action.type) {
    case 'RESET':
      return initialState;
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
    case 'SET_IMAGES': {
      const newState: IAppContext = {
        ...state,
        images: action.payload,
      };
      return newState;
    }
    case 'SET_LIST': {
      const newState: IAppContext = {
        ...state,
        list: action.payload,
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

  const { model, images, favorites } = state;
  useEffect(() => {
    if (images.length > 0) {
      console.log('detected changes on "images", resetting working state..');
      dispatch({ type: 'SET_WORKING', payload: false });
    }
  }, [images]);
  const operations = useMemo(
    () => ({
      handleReset: () => dispatch({ type: 'RESET' }),
      setWorking: (working: boolean) =>
        dispatch({ type: 'SET_WORKING', payload: working }),
      setList: (newList: ImageWithDefinitions[]) =>
        dispatch({ type: 'SET_LIST', payload: newList }),
      setNudityMap: (nudityMap: Map<string, NudityResponse>) =>
        dispatch({ type: 'SET_NUDITY_MAP', payload: nudityMap }),
      setImages: (images: ImageWithDefinitions[]) =>
        dispatch({ type: 'SET_IMAGES', payload: images }),
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

          console.log('✅ Got all image defs..', { imageDefs, dir });
          if (imagesWithDefsFinal.length > 0) {
            dispatch({ type: 'SET_IMAGES', payload: imagesWithDefsFinal });
            storeDataOnFileSystem(
              `${hashCode(dir)}.json`,
              JSON.stringify(imagesWithDefsFinal)
            );
          } else {
            dispatch({ type: 'SET_WORKING', payload: false });
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
    }),
    [favorites, model]
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
