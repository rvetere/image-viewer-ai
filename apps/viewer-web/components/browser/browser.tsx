import { FunctionComponent } from 'react';
import styles from './browser.module.css';
import { useAppContext } from '../../context/appContext';
import { LocalImage } from '../image/image';

export const Browser: FunctionComponent = () => {
  const { browsingData } = useAppContext();
  return (
    <div className={styles.browsingData}>
      {browsingData.map((image, index) => {
        return (
          <LocalImage key={`image-${image.src}`} index={index} image={image} />
        );
      })}
    </div>
  );
};
