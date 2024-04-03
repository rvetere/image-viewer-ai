/* eslint-disable @next/next/no-img-element */
import { FC, useEffect, useRef } from 'react';
import { ImageWithDefinitions } from '../../context/types';
import { createPortal } from 'react-dom';
import styles from './originalImage.module.css';

export const OriginalImage: FC<{
  image: ImageWithDefinitions;
  reset: () => void;
}> = ({ image, reset }) => {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (ref && ref.current) {
      let y = window.scrollY;
      if (y < 48) {
        y = 48;
      }
      ref.current.style.top = `${y}px`;
    }
  }, [ref]);
  return createPortal(
    <img
      ref={ref}
      src={`file://${image.src}`}
      alt={image.src}
      onClick={reset}
      className={styles.originalImage}
    />,
    document.getElementById('bigImagePortal')
  );
};
