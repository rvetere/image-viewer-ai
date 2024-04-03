/* eslint-disable @next/next/no-img-element */
import { FunctionComponent, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ImageWithDefinitions } from '../../lib/types';
import styles from './originalImage.module.css';

export const OriginalImage: FunctionComponent<{
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
