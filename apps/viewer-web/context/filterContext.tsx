import {
  FunctionComponent,
  ReactNode,
  createContext,
  useContext,
  useMemo,
  useReducer,
} from 'react';
import { useFilterLogic } from '../hooks/useFilterLogic';
import { ImageFilter, ImageFormat } from '../lib/types';

export interface IFilterContext {
  filter: ImageFilter;
  format: ImageFormat;
  onlyFaves: boolean;
  showBoundingBox: boolean;
}

export interface IFilterOperationsContext {
  setState: (state: Partial<IFilterContext>) => void;
}

export type FilterContextAction =
  | { type: 'SET_STATE'; payload: Partial<IFilterContext> }
  | { type: 'RESET' };

const initialState: IFilterContext = {
  filter: 'sexyOnly',
  format: 'all',
  onlyFaves: false,
  showBoundingBox: false,
};

function filterContextReducer(
  state: IFilterContext,
  action: FilterContextAction
): IFilterContext {
  switch (action.type) {
    case 'RESET':
      return initialState;
    case 'SET_STATE':
      return { ...state, ...action.payload };
    default:
      throw new Error(`Unhandled action type: ${action}`);
  }
}

const FilterContext = createContext<IFilterContext | undefined | null>(null);

const FilterOperationsContext = createContext<IFilterOperationsContext | null>(
  null
);

export const FilterContextProvider: FunctionComponent<{
  children: ReactNode;
}> = ({ children }) => {
  const [state, dispatch] = useReducer(filterContextReducer, initialState);

  useFilterLogic(state, dispatch);

  const operations = useMemo(
    () => ({
      setState: (state: Partial<IFilterContext>) =>
        dispatch({ type: 'SET_STATE', payload: state }),
    }),
    []
  );
  return (
    <FilterContext.Provider value={state}>
      <FilterOperationsContext.Provider value={operations}>
        {children}
      </FilterOperationsContext.Provider>
    </FilterContext.Provider>
  );
};

export const useFilterContext = () => {
  const context = useContext(FilterContext);

  if (context === null) {
    throw new Error('Must be within FilterContextProvider');
  }

  return context;
};

export const useFilterOperations = () => {
  const context = useContext(FilterOperationsContext);

  if (!context) {
    throw new Error('Must be within FilterContextProvider');
  }

  return context;
};
