import classNames from 'classnames';
import * as nsfwjs from 'nsfwjs';
import { useEffect, useState } from 'react';
import {
  BrowseResponse,
  ImageWithDefinitions,
  LocalImage,
  NudityResponse,
} from '../components/Image';
import styles from './index.module.css';

const BATCH_SIZE = 2000;

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

export function Index() {
  const [nudityMap, setNudityMap] = useState(new Map<string, NudityResponse>());
  useEffect(() => {
    if (nudityMap.size > 0) {
      const serialize = {};
      for (const [key, value] of nudityMap.entries()) {
        serialize[key] = value;
      }
      localStorage.setItem('nudityMap', JSON.stringify(serialize));
    }
  }, [nudityMap]);

  const [model, setModel] = useState<nsfwjs.NSFWJS>();
  useEffect(() => {
    if (!model) {
      nsfwjs.load().then((_model) => {
        setModel(_model);
      });
    }
    const nudityMapStored = localStorage.getItem('nudityMap');
    if (nudityMapStored) {
      const newNudityMap = new Map<string, NudityResponse>(
        Object.entries(JSON.parse(nudityMapStored))
      );
      console.log({ newNudityMap });

      setNudityMap(newNudityMap);
    }
  }, []);

  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);

  const [images, setImages] = useState<ImageWithDefinitions[]>([]);
  const handleBrowse = () => {
    setWorking(true);
    // @ts-expect-error bla
    window.electron.browse().then(async ([dir, imagePaths]) => {
      console.log({ dir, len: imagePaths.length });

      const batches = getBatches(imagePaths);

      const batchCount = batches.length;
      console.log(`Got ${batchCount} batches of ${BATCH_SIZE}`);
      const existingData = localStorage.getItem('images')
        ? JSON.parse(localStorage.getItem('images'))
        : {};
      const existingDefs = existingData[dir] || [];
      let imagesWithDefsFinal = existingDefs;
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
          localStorage.setItem(
            'images',
            JSON.stringify({
              ...existingData,
              [dir]: imagesWithDefsFinal,
            })
          );
        }

        console.log('Sleep 10 miliseconds until next batch..');
        await sleep(10);
      }

      setImages(imagesWithDefsFinal);

      setWorking(false);
      setProgress(0);
      console.log('finished processing!', { imagesWithDefsFinal });
    });
  };

  const [filter, setFilter] = useState('all');
  const handleFilterSexyOnly = () => {
    setFilter(filter === 'all' ? 'sexyOnly' : 'all');
  };

  return (
    <div className={classNames(styles.page, { [styles.working]: working })}>
      <div>
        {progress > 0 && <span>{progress}%</span>}
        {model && <button onClick={handleBrowse}>Browse</button>}
        {images.length > 0 && (
          <button
            onClick={handleFilterSexyOnly}
            className={classNames({ [styles.active]: filter === 'sexyOnly' })}
          >
            Sexy only
          </button>
        )}
      </div>
      <div className={styles.list}>
        {images
          .filter((image) => {
            if (filter === 'all') {
              return true;
            } else if (filter === 'sexyOnly') {
              const neutral = image.predictions.find(
                (p) => p.className === 'Neutral'
              );
              const sexy = image.predictions.find(
                (p) => p.className === 'Sexy'
              );
              const hentai = image.predictions.find(
                (p) => p.className === 'Hentai'
              );
              const porn = image.predictions.find(
                (p) => p.className === 'Porn'
              );
              const isSexy = (sexy && sexy.probability >= 0.4) ||
              (hentai && hentai.probability >= 0.4) ||
              (porn && porn.probability >= 0.4)
              return (
                isSexy && neutral.probability < 0.3
              );
            }
          })
          .sort((a, b) => {
            const sizeA = a.size.width * a.size.height;
            const sizeB = b.size.width * b.size.height;
            if (sizeA > sizeB) {
              return -1;
            } else if (sizeA < sizeB) {
              return 1;
            }
            return 0;
          })
          .map((image, index) => (
            <LocalImage
              key={`image-${index}`}
              image={image}
              nudityMap={nudityMap}
              setNudityMap={setNudityMap}
            />
          ))}
      </div>
    </div>
  );
}

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

export default Index;
