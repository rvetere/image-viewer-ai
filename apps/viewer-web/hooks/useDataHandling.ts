import * as nsfwjs from 'nsfwjs';
import { useEffect, useState } from 'react';
import {
  BrowseResponse,
  ImageWithDefinitions,
  NudityResponse,
} from '../components/Image';
import { hashCode } from '../helpers/hashCode';

const BATCH_SIZE = 400;

export const useDataHandling = () => {
  const [browsingDir, setBrowsingDir] = useState<string | null>(null);
  const [nudityMap, setNudityMap] = useState(new Map<string, NudityResponse>());
  const [favorites, setFavorites] = useState<string[]>([]);

  const [model, setModel] = useState<nsfwjs.NSFWJS>();
  useEffect(() => {
    nsfwjs.load().then((_model) => {
      setModel(_model);
    });
    // @ts-expect-error bla
    window.electron.getData(`favorites.json`).then((data) => {
      const favorites = JSON.parse(data);
      setFavorites(favorites);
    });
  }, []);

  const storeNudityMap = (_nudityMap: Map<string, NudityResponse>) => {
    const serialize = {};
    for (const [key, value] of _nudityMap.entries()) {
      if (value && typeof value !== 'string') {
        serialize[key] = value;
      }
    }
    console.log('Save new nudityMap: ', Object.keys(serialize).length);

    // @ts-expect-error bla
    window.electron
      .storeData(
        `${hashCode(browsingDir)}_nudity.json`,
        JSON.stringify(serialize)
      )
      .then((results) => {
        console.log('Stored nudity data', { results });
      });
  };
  useEffect(() => {
    if (browsingDir && nudityMap.size > 0) {
      storeNudityMap(nudityMap);
    }
  }, [browsingDir, nudityMap]);
  useEffect(() => {
    if (favorites.length > 0) {
      // @ts-expect-error bla
      window.electron
        .storeData(`favorites.json`, JSON.stringify(favorites))
        .then((results) => {
          console.log('Stored favorites data', { results });
        });
    }
  }, [favorites]);

  useEffect(() => {
    if (browsingDir) {
      // @ts-expect-error bla
      window.electron
        .getData(`${hashCode(browsingDir)}_nudity.json`)
        .then((nudityMapStr) => {
          if (nudityMapStr) {
            const newNudityMap = new Map<string, NudityResponse>(
              Object.entries(JSON.parse(nudityMapStr))
            );
            console.log({ newNudityMap });

            setNudityMap(newNudityMap);
          }
        });
    }
  }, [browsingDir]);

  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);

  const [selected, setSelected] = useState<string[]>([]);
  const [subSelected, setSubSelected] = useState<string[]>([]);
  const [images, setImages] = useState<ImageWithDefinitions[]>([]);
  const handleBrowse = () => {
    setWorking(true);
    setSelected([]);
    setSubSelected([]);
    setImages([]);
    setBrowsingDir(null);
    setNudityMap(new Map<string, NudityResponse>());
    // @ts-expect-error bla
    window.electron.browse().then(async ([dir, imagePaths]) => {
      // @ts-expect-error bla
      const existing = await window.electron.getData(`${hashCode(dir)}.json`);
      setBrowsingDir(dir);
      console.log({ dir, len: imagePaths });

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

      const batches = getBatches(imagePaths);
      const batchCount = batches.length;
      console.log(`Got ${batchCount} batches of ${BATCH_SIZE}`);
      while (batches.length) {
        const batch = batches.shift();
        const newProgress = (100 * (batchCount - batches.length)) / batchCount;
        setProgress(newProgress);
        console.log(`Fetch info for batch, ${newProgress}%..`);

        const notFetched = batch.filter(
          (imagePath) => !existingDefs.find((def) => def.src === imagePath.src)
        );
        console.log({ notFetched });

        const promises = notFetched.map(async (imagePath) => {
          const imageDefs = await getImageDef(imagePath, model);

          return imageDefs;
        });

        const imageDefs = await Promise.all(promises);
        console.log('Got image defs of batch..', { imageDefs });

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
        if (notFetched.length) {
          // @ts-expect-error bla
          window.electron
            .storeData(
              `${hashCode(dir)}.json`,
              JSON.stringify(imagesWithDefsFinal)
            )
            .then((results) => {
              console.log('Stored data', { results });
            });
        }

        console.log('Sleep 10 miliseconds until next batch..');
        await sleep(10);
      }

      setImages(imagesWithDefsFinal);
      // setCount(imagesWithDefsFinal.length);

      // @ts-expect-error bla
      window.electron
        .storeData(`${hashCode(dir)}.json`, JSON.stringify(imagesWithDefsFinal))
        .then((results) => {
          console.log('Stored data', { results });
        });

      setWorking(false);
      setProgress(0);
      console.log('finished processing!', { imagesWithDefsFinal });
    });
  };

  return {
    nudityMap,
    setNudityMap,
    storeNudityMap,
    favorites,
    setFavorites,
    model,
    browsingDir,
    handleBrowse,
    images,
    setImages,
    selected,
    setSelected,
    subSelected,
    setSubSelected,
    working,
    setWorking,
    progress,
  };
};

type ImageDef = {
  size: { width: number; height: number };
  predictions: nsfwjs.predictionType[];
};

const getImageDef = (image: BrowseResponse, model: nsfwjs.NSFWJS) => {
  return new Promise((resolve: (value: ImageDef) => void, reject) => {
    const img = new Image();

    img.onload = function () {
      model
        ?.classify(img)
        .then((predictions) => {
          resolve({
            predictions,
            size: { width: img.width, height: img.height },
          });
        })
        .catch((e) => {
          console.error(e);
          resolve({
            predictions: [],
            size: { width: img.width, height: img.height },
          });
        });
    };

    img.src = image.resizedDataUrl
      ? `file://${image.resizedDataUrl}`
      : `file://${image.src}`;
  });
};

const getBatches = (paths: BrowseResponse[]) => {
  const batches: BrowseResponse[][] = [];
  while (paths.length) {
    const limit = paths.length >= BATCH_SIZE ? BATCH_SIZE : paths.length;
    const batch = paths.splice(0, limit);
    batches.push(batch);
  }
  return batches;
};

const sleep = (time: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
};
