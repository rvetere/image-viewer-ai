import classNames from 'classnames';
import { FunctionComponent, useMemo } from 'react';
import { useAppContext, useAppOperations } from '../../context/appContext';
import {
  useFilterContext,
  useFilterOperations,
} from '../../context/filterContext';
import { ImageFilter } from '../../lib/types';
import styles from './navigation.module.css';

export const Navigation: FunctionComponent = () => {
  const { browsingData, originalData } = useAppContext();
  const { handleBrowse } = useAppOperations();
  const { filter, format, onlyFaves, showBoundingBox } = useFilterContext();
  const { setState } = useFilterOperations();

  const handleFilterSexyOnly = () => {
    setState({ filter: filter === 'sexyOnly' ? 'all' : 'sexyOnly' });
  };
  const handleFilterButtocksOnly = () => {
    setState({ filter: filter === 'buttocksOnly' ? 'all' : 'buttocksOnly' });
  };
  const handleFilterBreastsOnly = () => {
    setState({ filter: filter === 'breastsOnly' ? 'all' : 'breastsOnly' });
  };

  const handleFormatGifsOnly = () => {
    setState({ format: format === 'gifsOnly' ? 'all' : 'gifsOnly' });
  };

  const handleFormatStaticOnly = () => {
    setState({ format: format === 'staticOnly' ? 'all' : 'staticOnly' });
  };

  const handleOnlyFaves = () => {
    setState({ onlyFaves: !onlyFaves });
  };

  const toggleShowBoundingBox = () =>
    setState({ showBoundingBox: !showBoundingBox });

  const handleNudityFilter = (word: string) => () =>
    setState({ filter: word as ImageFilter });

  const wordCloud = useMemo<{ [name: string]: number }>(() => {
    const cloud: { [name: string]: number } = {};
    originalData
      .map((image) => {
        return [...(image.predictions?.parts || [])];
      })
      .filter((out) => !!out)
      .forEach((out) => {
        out.forEach((detection) => {
          cloud[detection.class] =
            (cloud[detection.class] || 0) + detection.score;
        });
      });
    return cloud;
  }, [originalData]);

  return (
    <div className={styles.navigation}>
      <button onClick={handleBrowse}>Browse</button>
      <div className={styles.counter}>{browsingData.length}x</div>
      <div className={styles.mainFunctions}>
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
