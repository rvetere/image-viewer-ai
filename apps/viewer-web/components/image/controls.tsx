import classNames from 'classnames';
import { Dispatch, FC, SetStateAction } from 'react';
import {
  useImageContext,
  useImageOperations,
} from '../../context/image.context';
import { ImageWithDefinitions } from '../../context/types';
import styles from './controls.module.css';

interface IControlsProps {
  image: ImageWithDefinitions;
  showOriginal: boolean;
  setShowOriginal: Dispatch<SetStateAction<boolean>>;
}

export const Controls: FC<IControlsProps> = ({
  image,
  showOriginal,
  setShowOriginal,
}) => {
  const { favorites } = useImageContext();
  const { handleFavorite } = useImageOperations();
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
        <div className={classNames(styles.text, styles.predictions)}>
          {image.predictions &&
            image.predictions.map((p, index) => (
              <span key={`prediction-${index}`}>
                {p.className}
                <sup>{p.probability.toFixed(2)}</sup>
              </span>
            ))}
        </div>
      )}
    </>
  );
};
