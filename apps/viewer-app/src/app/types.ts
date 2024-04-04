import * as nsfwjs from 'nsfwjs';

export type BrowseResponse = {
  src: string;
  resizedDataUrl?: string;
  size: { width: number; height: number };
};

export type ImageWithDefinitions = BrowseResponse & {
  predictions: nsfwjs.predictionType[];
};
