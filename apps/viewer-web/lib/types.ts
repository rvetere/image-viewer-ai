import * as nsfwjs from 'nsfwjs';

export type ImageFormat = 'all' | 'gifsOnly' | 'staticOnly';
export type ImageFilter = 'all' | 'sexyOnly' | 'buttocksOnly' | 'breastsOnly';

export type BrowseResponse = {
  src: string;
  resizedDataUrl?: string;
  size: { width: number; height: number };
};

export type ImageWithDefinitions = BrowseResponse & {
  predictions: nsfwjs.predictionType[];
};

type NudityDetections = {
  bounding_box: number[];
  confidence: string;
  name: string;
};

type NudityOutput = {
  detections: NudityDetections[];
  nsfw_score: number;
};

export type NudityResponse = {
  id: string;
  output: NudityOutput;
};
