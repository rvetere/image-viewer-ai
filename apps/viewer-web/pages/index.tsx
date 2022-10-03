import classNames from 'classnames';
import * as nsfwjs from 'nsfwjs';
import { useCallback, useEffect, useState } from 'react';
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
        if (value && typeof value !== 'string') {
          serialize[key] = value;
        }
      }
      console.log('Save new nudityMap: ', Object.keys(serialize).length);

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
      setCount(imagesWithDefsFinal.length);

      setWorking(false);
      setProgress(0);
      console.log('finished processing!', { imagesWithDefsFinal });
    });
  };

  const [filter, setFilter] = useState('all');
  const filterFn = useCallback(
    (image) => {
      const neutral = image.predictions.find((p) => p.className === 'Neutral');
      const sexy = image.predictions.find((p) => p.className === 'Sexy');
      const hentai = image.predictions.find((p) => p.className === 'Hentai');
      const porn = image.predictions.find((p) => p.className === 'Porn');
      const isSexy =
        (sexy && sexy.probability >= 0.4) ||
        (hentai && hentai.probability >= 0.4) ||
        (porn && porn.probability >= 0.4);

      if (filter === 'all') {
        return true;
      } else if (filter === 'buttocksOnly') {
        const nudity = nudityMap.get(
          image.resizedDataUrl ? image.resizedDataUrl : image.src
        );
        if (nudity) {
          const check =
            nudity.output &&
            nudity.output.detections.find((d) =>
              d.name.toLowerCase().includes('buttocks')
            );
          return (
            isSexy &&
            neutral.probability < 0.3 &&
            check &&
            parseFloat(check.confidence) > 0.67
          );
        }
        return false;
      } else if (filter === 'breastsOnly') {
        const nudity = nudityMap.get(
          image.resizedDataUrl ? image.resizedDataUrl : image.src
        );
        if (nudity) {
          const check =
            nudity.output &&
            nudity.output.detections
              .sort(
                (a, b) => parseFloat(b.confidence) - parseFloat(a.confidence)
              )
              .find((d) => d.name.toLowerCase().includes('breast'));
          return (
            isSexy &&
            neutral.probability < 0.3 &&
            nudity.output &&
            nudity.output.nsfw_score > 0.67 &&
            check &&
            parseFloat(check.confidence) > 0.67
          );
        }
        return false;
      } else if (filter === 'sexyOnly') {
        return isSexy && neutral.probability < 0.3;
      }
    },
    [filter]
  );
  const sortWithFilter =
    (search: string) => (a: ImageWithDefinitions, b: ImageWithDefinitions) => {
      const aNudity = nudityMap.get(
        a.resizedDataUrl ? a.resizedDataUrl : a.src
      );
      const bNudity = nudityMap.get(
        b.resizedDataUrl ? b.resizedDataUrl : b.src
      );
      if (aNudity && bNudity) {
        const aCheck = aNudity.output.detections.find((d) =>
          d.name.toLowerCase().includes(search)
        );
        const bCheck = bNudity.output.detections.find((d) =>
          d.name.toLowerCase().includes(search)
        );
        if (aCheck && bCheck) {
          return parseFloat(bCheck.confidence) - parseFloat(aCheck.confidence);
        }
      }
    };
  const [count, setCount] = useState(images.length);
  const handleFilterSexyOnly = () => {
    setFilter(filter === 'sexyOnly' ? 'all' : 'sexyOnly');
  };
  const handleFilterButtocksOnly = () => {
    setFilter(filter === 'buttocksOnly' ? 'all' : 'buttocksOnly');
  };
  const handleFilterBreastsOnly = () => {
    setFilter(filter === 'breastsOnly' ? 'all' : 'breastsOnly');
  };
  useEffect(() => {
    setCount(images.filter(filterFn).length);
  }, [filter, images.length]);

  const handleNudityApi = (_nudityMap: Map<string, NudityResponse>) => () => {
    setWorking(true);
    const toFetch = images
      .filter(filterFn)
      .filter(
        (image) =>
          !_nudityMap.get(
            image.resizedDataUrl ? image.resizedDataUrl : image.src
          )
      )
      .map((image) =>
        image.resizedDataUrl ? image.resizedDataUrl : image.src
      );
    console.log({ toFetch });
    // @ts-expect-error bla
    window.electron
      .nudityAiBulk(toFetch.length > 100 ? toFetch.slice(0, 100) : toFetch)
      .then((results) => {
        const newNudityMap = new Map<string, NudityResponse>(_nudityMap);
        toFetch.forEach((src, index) => {
          const result = results[index];
          if (result && typeof result !== 'string') {
            newNudityMap.set(src, result);
          }
        });
        setNudityMap(newNudityMap);

        setWorking(false);

        console.log('new size of nudity map:', newNudityMap.size);

        if (newNudityMap.size < count) {
          setTimeout(() => {
            handleNudityApi(newNudityMap)();
          }, 3000);
        }
      });
  };

  const [showBoundingBox, setShowBoundingBox] = useState(true);
  const toggleShowBoundingBox = () => setShowBoundingBox(!showBoundingBox);

  return (
    <div className={classNames(styles.page, { [styles.working]: working })}>
      <div className={styles.navigation}>
        {progress > 0 && <div style={{ marginRight: 8 }}>{progress}%</div>}
        {model && <button onClick={handleBrowse}>Browse</button>}
        {images.length > 0 && (
          <button
            onClick={handleFilterSexyOnly}
            className={classNames({ [styles.active]: filter === 'sexyOnly' })}
          >
            Sexy only
          </button>
        )}
        {images.length > 0 && (
          <button
            onClick={handleFilterButtocksOnly}
            className={classNames({
              [styles.active]: filter === 'buttocksOnly',
            })}
          >
            Buttocks only
          </button>
        )}
        {images.length > 0 && (
          <button
            onClick={handleFilterBreastsOnly}
            className={classNames({
              [styles.active]: filter === 'breastsOnly',
            })}
          >
            Breasts only
          </button>
        )}
        {images.length > 0 && (
          <button
            onClick={toggleShowBoundingBox}
            className={classNames({
              [styles.active]: showBoundingBox,
            })}
          >
            Show bounding box
          </button>
        )}

        {count > 0 && filter === 'sexyOnly' && (
          <button onClick={handleNudityApi(nudityMap)}>Run Nudity API</button>
        )}

        <span>{count}x</span>
      </div>
      <div className={styles.list}>
        {images
          .filter(filterFn)
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
          .sort((a, b) => {
            if (filter === 'buttocksOnly') {
              return sortWithFilter('buttocks')(a, b);
            } else if (filter === 'breastsOnly') {
              return sortWithFilter('breast')(a, b);
            }
            return 0;
          })
          .map((image, index) => (
            <LocalImage
              key={`image-${index}`}
              image={image}
              nudityMap={nudityMap}
              setNudityMap={setNudityMap}
              showBoundingBox={showBoundingBox}
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
