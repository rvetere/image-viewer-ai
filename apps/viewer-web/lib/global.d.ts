// custom-types.d.ts

import { BrowseResponse, ImageWithDefinitions } from './types';

declare global {
  interface Window {
    electron: {
      // Example of what might be on your electron object
      browse: () => Promise<
        [dir: string, imagePaths: BrowseResponse[], scanId: number]
      >;
      classifyImages: (
        paths: BrowseResponse[],
        existingDefs: ImageWithDefinitions[]
      ) => Promise<ImageWithDefinitions[]>;
      insertScans: (directories: string[]) => boolean;
      insertFiles: (scanId: number, files: ImageWithDefinitions[]) => boolean;
      getFiles: (scanId: number) => ImageWithDefinitions[];
      updateFileFavorite: (id: number, favorite: boolean) => boolean;
    };
  }
}

// This export is required to ensure this file is considered a module
// and its contents are globally available rather than being locally scoped.
export {};
