import classNames from 'classnames';
import { Dispatch, FunctionComponent, SetStateAction } from 'react';
import { useAppContext, useAppOperations } from '../../context/appContext';
import { ImageWithDefinitions } from '../../lib/types';
import styles from './controls.module.css';

interface IControlsProps {
  image: ImageWithDefinitions;
  showOriginal: boolean;
  setShowOriginal: Dispatch<SetStateAction<boolean>>;
}

export const Controls: FunctionComponent<IControlsProps> = ({
  image,
  showOriginal,
  setShowOriginal,
}) => {
  const { favorites } = useAppContext();
  const { handleFavorite } = useAppOperations();
  return (
    <>
      <button
        className={styles.openBig}
        onClick={() => {
          setShowOriginal(true);
        }}
      >
        Spot
      </button>

      <button
        title="Like"
        onClick={handleFavorite(image)}
        className={styles.favorite}
      >
        {favorites.includes(image.src) ? '💜' : '🤍'}
      </button>

      {!showOriginal && (
        <div className={classNames(styles.text, styles.nudenet)}>
          {image.nudenet &&
            image.nudenet?.parts.map((p, index) => (
              <span key={`prediction-${index}`}>
                {p.class}
                <sup>{p.score.toFixed(2)}</sup>
              </span>
            ))}
        </div>
      )}
    </>
  );
};
