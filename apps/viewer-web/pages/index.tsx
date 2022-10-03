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

const BATCH_SIZE = 2;

type ImageDef = {
  width: number;
  height: number;
  predictions: nsfwjs.predictionType[];
};

const getImageDef = (image: BrowseResponse, model: nsfwjs.NSFWJS) => {
  return new Promise((resolve: (value: ImageDef) => void, reject) => {
    const img = new Image();

    img.onload = function () {
      model
        ?.classify(img)
        .then((predictions) => {
          resolve({ width: img.width, height: img.height, predictions });
        })
        .catch((e) => {
          console.error(e);
          resolve({ width: img.width, height: img.height, predictions: [] });
        });
    };

    img.src = image.resizedDataUri
      ? image.resizedDataUri
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
    setWorking(true)
    // @ts-expect-error bla
    window.electron.browse().then(async (imagePaths) => {
      console.log({ len: imagePaths.length });

      const batches = getBatches(imagePaths);
      let imagesWithDefsFinal = [];

      const batcheCount = batches.length;
      console.log(`Got ${batcheCount} batches of ${BATCH_SIZE}`);
      while (batches.length) {
        const batch = batches.shift();
        setProgress((100 * (batcheCount - batches.length)) / batcheCount);
        console.log(`Fetch info for batch, ${progress}%..`);

        const promises = batch.map(async (imagePath, index) => {
          const imageDefs = await getImageDef(imagePath, model);

          return imageDefs;
        });

        const imageDefs = await Promise.all(promises);
        console.log('Got image defs of batch..', { imageDefs });

        const imagesWithDefs = batch.map((imagePath, index) => {
          const defs = imageDefs[index];
          return {
            src: imagePath.src,
            resizedDataUri: imagePath.resizedDataUri,
            ...defs,
          };
        });
        imagesWithDefsFinal = [...imagesWithDefsFinal, ...imagesWithDefs];

        console.log('Sleep 800 miliseconds until next batch..');
        await sleep(800);
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
              const sexy = image.predictions.find(
                (p) => p.className === 'Sexy'
              );
              const hentai = image.predictions.find(
                (p) => p.className === 'Hentai'
              );
              const porn = image.predictions.find(
                (p) => p.className === 'Porn'
              );
              return (
                (sexy && sexy.probability >= 0.5) ||
                (hentai && hentai.probability >= 0.5) ||
                (porn && porn.probability >= 0.5)
              );
            }
          })
          .sort((a, b) => {
            const sizeA = a.width * a.height;
            const sizeB = b.width * b.height;
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
