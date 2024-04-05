import classNames from 'classnames';
import { Dispatch, FunctionComponent, SetStateAction, useState } from 'react';
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

      <FavoriteCheckbox image={image} />

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

const FavoriteCheckbox: FunctionComponent<{ image: ImageWithDefinitions }> = ({
  image,
}) => {
  const { favorites } = useAppContext();
  const { handleFavorite } = useAppOperations();
  const [isChecked, setIsChecked] = useState<boolean>(image.favorite);
  const changeHandler = handleFavorite(image);
  return (
    <label className={styles.favoriteLabel}>
      {favorites.includes(image.src) ? '💜' : '🤍'}
      <input
        type="checkbox"
        checked={isChecked}
        onChange={(e) => {
          setIsChecked(e.target.checked);
          changeHandler(e);
        }}
        className={styles.favorite}
      />
    </label>
  );
};
