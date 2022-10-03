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
  // const [calculateProgress, setCalculateProgress] = useState(0);
  // const throttledSetCalcProgress = useCallback(
  //   throttle((p: number) => setCalculateProgress(p), 25),
  //   []
  // );
  // console.log({ calculateProgress });

  const [images, setImages] = useState<ImageWithDefinitions[]>([]);
  const handleBrowse = () => {
    // @ts-expect-error bla
    window.electron.browse().then((imagePaths: BrowseResponse[]) => {
      setWorking(true);

      const promises = imagePaths.map(async (imagePath, index) => {
        const imageDefs = await getImageDef(imagePath, model);

        return imageDefs;
      });

      Promise.all(promises).then((imageDefs) => {
        const imagesWithDefs = imagePaths.map((imagePath, index) => {
          const defs = imageDefs[index];
          return {
            src: imagePath.src,
            resizedDataUri: imagePath.resizedDataUri,
            ...defs,
          };
        });
        setImages(imagesWithDefs);

        setWorking(false);
        console.log('finished processing!', { imagesWithDefs });
      });
    });
  };

  const [filter, setFilter] = useState('all');
  const handleFilterSexyOnly = () => {
    setFilter('sexyOnly');
  };

  return (
    <div className={classNames(styles.page, { [styles.working]: working })}>
      <div>
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

export default Index;
