/* eslint-disable @next/next/no-img-element */
import classNames from 'classnames';
import * as nsfwjs from 'nsfwjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BrowseResponse,
  ImageWithDefinitions,
  LocalImage,
  NudityResponse,
} from '../components/Image';
import styles from './index.module.css';

const BATCH_SIZE = 400;

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
  const [browsingDir, setBrowsingDir] = useState<string | null>(null);
  const [nudityMap, setNudityMap] = useState(new Map<string, NudityResponse>());

  const [model, setModel] = useState<nsfwjs.NSFWJS>();
  useEffect(() => {
    if (!model) {
      nsfwjs.load().then((_model) => {
        setModel(_model);
      });
    }
  }, []);

  const storeNudityMap = (_nudityMap) => {
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
      console.log({ dir, len: imagePaths.length });

      let existingDefs = existing ? JSON.parse(existing) : [];
      if (existingDefs.length > imagePaths.length) {
        existingDefs = existingDefs.filter((existing) =>
          imagePaths.map((i) => i.src).includes(existing.src)
        );
      }
      let imagesWithDefsFinal = existingDefs;

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
      setCount(imagesWithDefsFinal.length);

      setWorking(false);
      setProgress(0);
      console.log('finished processing!', { imagesWithDefsFinal });
    });
  };

  const [filter, setFilter] = useState('all');
  const [format, setFormat] = useState('all');
  const filterFormat = useCallback(
    (image) => {
      if (format === 'all') {
        return true;
      }
      const extension = image.src.split('.').pop();
      if (format === 'gifsOnly') {
        return extension === 'gif';
      } else if (format === 'staticOnly') {
        return extension !== 'gif';
      }
    },
    [format]
  );
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
        return true && filterFormat(image);
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
            parseFloat(check.confidence) > 0.67 &&
            filterFormat(image)
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
            parseFloat(check.confidence) > 0.67 &&
            filterFormat(image)
          );
        }
        return false;
      } else if (filter === 'sexyOnly') {
        return isSexy && neutral.probability < 0.3 && filterFormat(image);
      } else {
        // word filter
        const nudity = nudityMap.get(
          image.resizedDataUrl ? image.resizedDataUrl : image.src
        );
        if (nudity) {
          const check =
            nudity.output &&
            nudity.output.detections.find((d) => d.name.includes(filter));
          return (
            isSexy &&
            neutral.probability < 0.3 &&
            check &&
            parseFloat(check.confidence) > 0.67 &&
            filterFormat(image)
          );
        }
        return false;
      }
    },
    [filter, format]
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

  const handleFormatGifsOnly = () => {
    setFormat(format === 'gifsOnly' ? 'all' : 'gifsOnly');
  };

  const handleFormatStaticOnly = () => {
    setFormat(format === 'staticOnly' ? 'all' : 'staticOnly');
  };

  useEffect(() => {
    setCount(images.filter(filterFn).length);
  }, [filter, format, images.length]);

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

  const handleNudityFilter = (word: string) => () => {
    setFilter(word);
  };

  const wordCloud = useMemo<{ [name: string]: number }>(() => {
    const cloud: { [name: string]: number } = {};
    images
      .filter(filterFn)
      .map((image) => {
        const nudity = nudityMap.get(
          image.resizedDataUrl ? image.resizedDataUrl : image.src
        );
        return {
          ...image,
          ...nudity,
        };
      })
      .map((image) => {
        return [...((image.output && image.output.detections) || [])];
      })
      .filter((out) => !!out)
      .forEach((out) => {
        out.forEach((detection) => {
          cloud[detection.name] =
            (cloud[detection.name] || 0) + parseFloat(detection.confidence);
        });
      });
    return cloud;
  }, [images]);

  const handleDelete = () => {
    // @ts-expect-error bla
    window.electron.deleteImage(subSelected).then((results) => {
      const newNudityMap = new Map<string, NudityResponse>();
      for (const [key, value] of nudityMap.entries()) {
        if (!selected.includes(key)) {
          newNudityMap.set(key, value);
        }
      }
      storeNudityMap(newNudityMap);

      const newSubSelected = subSelected.filter(
        (src) => !subSelected.includes(src)
      );
      setSubSelected(newSubSelected);
      const newSelected = selected.filter((src) => !subSelected.includes(src));
      setSelected(newSelected);
      const newImages = images.filter(
        (image) => !subSelected.includes(image.src)
      );
      setImages(newImages);
    });
  };
  const [selectStartIndex, setSelectStartIndex] = useState(-1);
  const handleSelect = (index: number) => (event: any) => {
    if (selectStartIndex === -1) {
      setSelectStartIndex(index);
    } else if (event.shiftKey) {
      const newSelected = images
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
          } else if (filter !== 'all' && filter !== 'sexyOnly') {
            return sortWithFilter(filter)(a, b);
          }
          return 0;
        })
        .filter((image, idx) => idx >= selectStartIndex && idx <= index)
        .map((image) => image.src);
      setSelected(newSelected);
    }
  };

  return (
    <div className={classNames(styles.page, { [styles.working]: working })}>
      <div className={styles.navigation}>
        {model && <button onClick={handleBrowse}>Browse</button>}
        <div className={styles.counter}>{count}x</div>
        <div className={styles.mainFunctions}>
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
              onClick={handleFormatGifsOnly}
              className={classNames({
                [styles.active]: format === 'gifsOnly',
              })}
            >
              Gifs only
            </button>
          )}
          {images.length > 0 && (
            <button
              onClick={handleFormatStaticOnly}
              className={classNames({
                [styles.active]: format === 'staticOnly',
              })}
            >
              Static only
            </button>
          )}
          {images.length > 0 && (
            <button
              onClick={toggleShowBoundingBox}
              className={classNames({
                [styles.active]: showBoundingBox,
              })}
            >
              Bounding box
            </button>
          )}
          {count > 0 && filter === 'sexyOnly' && (
            <button onClick={handleNudityApi(nudityMap)}>Run Nudity API</button>
          )}

          {Object.entries(wordCloud)
            .sort(([_aName, aConfidence], [_bName, bConfidence]) => {
              return bConfidence - aConfidence;
            })
            .map(([name, _confidence]) => {
              return (
                <button
                  key={name}
                  onClick={handleNudityFilter(name)}
                  className={classNames({
                    [styles.active]: filter === name,
                  })}
                >
                  {name}
                </button>
              );
            })}
        </div>
      </div>
      <div className={styles.layout}>
        <div className={styles.sidebar}>
          <div>
            {selected.length > 0 && (
              <>
                {selected.map((src) => {
                  const image = images.find((image) => image.src === src);
                  return (
                    <img
                      key={src}
                      title={`${image.size.width}x${image.size.height}`}
                      src={`file://${image?.resizedDataUrl || image?.src}`}
                      alt={src}
                      className={classNames(styles.selectedImage, {
                        [styles.subSelected]: subSelected.includes(src),
                      })}
                      onClick={(event: any) => {
                        if (event.shiftKey) {
                          const alreadySelected = selected.includes(src);
                          if (!alreadySelected) {
                            setSelected([...selected, src]);
                          } else {
                            setSelected(
                              selected.filter((_src) => _src !== src)
                            );
                          }
                        } else {
                          const isSelected = subSelected.includes(src);
                          if (!isSelected) {
                            setSubSelected([...subSelected, src]);
                          } else {
                            setSubSelected(
                              subSelected.filter((s) => s !== src)
                            );
                          }
                        }
                      }}
                    />
                  );
                })}
                {subSelected.length > 0 && (
                  <div>
                    <button onClick={handleDelete}>Delete</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className={styles.list}>
          {progress > 0 && <div style={{ marginRight: 8 }}>{progress}%</div>}
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
              } else if (filter !== 'all' && filter !== 'sexyOnly') {
                return sortWithFilter(filter)(a, b);
              }
              return 0;
            })
            .map((image, index) => (
              <LocalImage
                key={`image-${index}`}
                index={index}
                image={image}
                nudityMap={nudityMap}
                setNudityMap={setNudityMap}
                selected={selected}
                setSelected={setSelected}
                showBoundingBox={showBoundingBox}
                handleSelect={handleSelect}
              />
            ))}
        </div>
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

const hashCode = (input: string) => {
  if (!input) {
    return -1;
  }
  let hash = 0,
    i,
    chr;
  if (input.length === 0) return hash;
  for (i = 0; i < input.length; i++) {
    chr = input.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

export default Index;
