export type ImageFormat = 'all' | 'gifsOnly' | 'staticOnly';
export type ImageFilter = 'all' | 'sexyOnly' | 'buttocksOnly' | 'breastsOnly';

export type BrowseResponse = {
  src: string;
  resizedDataUrl?: string;
  size: { width: number; height: number };
};

export type ImageWithDefinitions = BrowseResponse & {
  id?: number;
  favorite: boolean;
  nudenet?: {
    input: {
      file: any;
      width: number | undefined;
      height: number | undefined;
    };
    person: boolean;
    sexy: boolean;
    nude: boolean;
    parts: {
      score: number;
      id: number;
      class: string;
      box: number[];
    }[];
  };
};
