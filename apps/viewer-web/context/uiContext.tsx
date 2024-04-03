import {
  FunctionComponent,
  ReactNode,
  createContext,
  type MouseEvent,
  useReducer,
  useMemo,
  useEffect,
  useContext,
} from 'react';
import { ImageFilter, ImageFormat } from '../lib/types';
import { useAppContext, useAppOperations } from './appContext';
import { useFilterLogic } from '../hooks/useFilterLogic';

export interface IUiContext {
  progress: number;
  selected: string[];
  subSelected: string[];
  selectStartIndex: number;
  filter: ImageFilter;
  format: ImageFormat;
  onlyFaves: boolean;
  showBoundingBox: boolean;
}

export interface IUiOperationsContext {
  setFilter: (filter: ImageFilter) => void;
  setFormat: (filter: ImageFormat) => void;
  setOnlyFaves: (onlyFaves: boolean) => void;
  setShowBoundingBox: (showBoundingBox: boolean) => void;
  setSelected: (selected: string[]) => void;
  setSubSelected: (subSelected: string[]) => void;
  handleSelect: (
    index: number
  ) => (event: MouseEvent<HTMLImageElement>) => void;
}

export type UiContextAction =
  | { type: 'SET_PROGRESS'; payload: number }
  | { type: 'SET_STATE'; payload: Partial<IUiContext> }
  | { type: 'RESET_SELECTED' }
  | { type: 'RESET' };

const initialState: IUiContext = {
  progress: 0,
  selected: [],
  subSelected: [],
  selectStartIndex: -1,
  filter: 'sexyOnly',
  format: 'all',
  onlyFaves: false,
  showBoundingBox: false,
};

function uiContextReducer(
  state: IUiContext,
  action: UiContextAction
): IUiContext {
  switch (action.type) {
    case 'RESET':
      return initialState;
    case 'RESET_SELECTED':
      return { ...state, selected: [], subSelected: [] };
    case 'SET_PROGRESS':
      return { ...state, progress: action.payload };
    case 'SET_STATE':
      return { ...state, ...action.payload };
    default:
      throw new Error(`Unhandled action type: ${action}`);
  }
}

const UiContext = createContext<IUiContext | undefined | null>(null);

const UiOperationsContext = createContext<IUiOperationsContext | null>(null);

export const UiContextProvider: FunctionComponent<{
  children: ReactNode;
}> = ({ children }) => {
  const [state, dispatch] = useReducer(uiContextReducer, initialState);

  const { selectStartIndex } = state;
  const { list, images } = useAppContext();
  useEffect(() => {
    if (images.length === 0) {
      console.log('app "images" are empty now, resetting ui context');
      dispatch({ type: 'RESET' });
    }
  }, [images]);
  useFilterLogic(state, dispatch);

  const operations = useMemo(
    () => ({
      setOnlyFaves: (onlyFaves: boolean) =>
        dispatch({ type: 'SET_STATE', payload: { onlyFaves } }),
      setShowBoundingBox: (showBoundingBox: boolean) =>
        dispatch({ type: 'SET_STATE', payload: { showBoundingBox } }),
      setFilter: (filter: ImageFilter) =>
        dispatch({ type: 'SET_STATE', payload: { filter } }),
      setFormat: (format: ImageFormat) =>
        dispatch({ type: 'SET_STATE', payload: { format } }),
      setSelected: (selected: string[]) =>
        dispatch({ type: 'SET_STATE', payload: { selected } }),
      setSubSelected: (subSelected: string[]) =>
        dispatch({ type: 'SET_STATE', payload: { subSelected } }),
      handleSelect:
        (index: number) => (event: MouseEvent<HTMLImageElement>) => {
          if (selectStartIndex === -1) {
            dispatch({
              type: 'SET_STATE',
              payload: { selectStartIndex: index },
            });
          } else if (event.shiftKey) {
            const newSelected = list
              .filter((_image, idx) => idx >= selectStartIndex && idx <= index)
              .map((image) => image.src);
            dispatch({
              type: 'SET_STATE',
              payload: { selected: newSelected },
            });
          }
        },
    }),
    [selectStartIndex, list]
  );
  return (
    <UiContext.Provider value={state}>
      <UiOperationsContext.Provider value={operations}>
        {children}
      </UiOperationsContext.Provider>
    </UiContext.Provider>
  );
};

export const useUiContext = () => {
  const context = useContext(UiContext);

  if (context === null) {
    throw new Error('Must be within UiContextProvider');
  }

  return context;
};

export const useUiOperations = () => {
  const context = useContext(UiOperationsContext);

  if (!context) {
    throw new Error('Must be within UiContextProvider');
  }

  return context;
};
