import classNames from 'classnames';
import { FunctionComponent, useMemo } from 'react';
import {
  useImageContext,
  useImageOperations,
} from '../../context/image.context';
import { ImageFilter } from '../../context/types';
import styles from './navigation.module.css';
import { useNudityApi } from '../../hooks/useNudityApi';

export const Navigation: FunctionComponent = () => {
  const {
    list,
    model,
    nudityMap,
    uiState: { filter, format, onlyFaves, showBoundingBox },
  } = useImageContext();
  const {
    setFilter,
    setFormat,
    setOnlyFaves,
    setShowBoundingBox,
    handleBrowse,
  } = useImageOperations();
  const { handleRunNudityApi } = useNudityApi();

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

  const handleOnlyFaves = () => {
    setOnlyFaves(!onlyFaves);
  };

  const toggleShowBoundingBox = () => setShowBoundingBox(!showBoundingBox);

  const handleNudityFilter = (word: string) => () =>
    setFilter(word as ImageFilter);

  const wordCloud = useMemo<{ [name: string]: number }>(() => {
    const cloud: { [name: string]: number } = {};
    list
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
  }, [list, nudityMap]);

  return (
    <div className={styles.navigation}>
      {model && <button onClick={handleBrowse}>Browse</button>}
      <div className={styles.counter}>{list.length}x</div>
      <div className={styles.mainFunctions}>
        {list.length > 0 && (
          <>
            <button
              onClick={handleFilterSexyOnly}
              className={classNames({
                [styles.active]: filter === 'sexyOnly',
              })}
            >
              Sexy only
            </button>
            <button
              onClick={handleFilterButtocksOnly}
              className={classNames({
                [styles.active]: filter === 'buttocksOnly',
              })}
            >
              Buttocks only
            </button>
            <button
              onClick={handleFilterBreastsOnly}
              className={classNames({
                [styles.active]: filter === 'breastsOnly',
              })}
            >
              Breasts only
            </button>
            <button
              onClick={handleFormatGifsOnly}
              className={classNames({
                [styles.active]: format === 'gifsOnly',
              })}
            >
              Gifs only
            </button>
            <button
              onClick={handleFormatStaticOnly}
              className={classNames({
                [styles.active]: format === 'staticOnly',
              })}
            >
              Static only
            </button>
            <button
              onClick={handleOnlyFaves}
              className={classNames({
                [styles.active]: onlyFaves,
              })}
            >
              💜
            </button>
            <button
              onClick={toggleShowBoundingBox}
              className={classNames({
                [styles.active]: showBoundingBox,
              })}
            >
              Bounding box
            </button>
          </>
        )}
        {list.length > 0 && filter === 'sexyOnly' && (
          <button onClick={handleRunNudityApi()}>Run Nudity API</button>
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
  );
};
