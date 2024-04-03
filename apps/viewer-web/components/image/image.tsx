/* eslint-disable @next/next/no-img-element */
import classNames from 'classnames';
import { FunctionComponent, MouseEvent, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { useAppContext } from '../../context/appContext';
import { ImageWithDefinitions } from '../../lib/types';
import { useUiContext, useUiOperations } from '../../context/uiContext';
import { Controls } from './controls';
import styles from './image.module.css';
import { NudityBoundingBoxes } from './nudityBoundingBox';
import { OriginalImage } from './originalImage';

type LocalImageProps = {
  index: number;
  image: ImageWithDefinitions;
};

export const LocalImage: FunctionComponent<LocalImageProps> = ({
  image,
  index,
}) => {
  const { nudityMap } = useAppContext();
  const { selected } = useUiContext();
  const src = image.resizedDataUrl ?? image.src;

  const { setSelected, handleSelect } = useUiOperations();

  const [showOriginal, setShowOriginal] = useState(false);
  const { ref, inView } = useInView({
    threshold: 0,
  });

  const [maxWidth, setMaxWidth] = useState(600);
  const { width, height, ratio, resized } = getDimensions(image, maxWidth);

  const handleImgClick = (e: MouseEvent<HTMLImageElement>) => {
    handleSelect(index)(e);

    if (!e.shiftKey) {
      const alreadySelected = selected.includes(image.src);
      if (!alreadySelected) {
        setSelected([...selected, image.src]);
      } else {
        setSelected(selected.filter((src) => src !== image.src));
      }
    }

    if (!nudityMap.has(src)) {
      // window.electron.nudityAi(src).then((result) => {
      //   setNudityMap((prev) => {
      //     const newMap = new Map(prev);
      //     newMap.set(src, result);
      //     return newMap;
      //   });
      // });
    } else {
      console.log(nudityMap.get(src));
    }
  };

  return (
    <>
      <div
        ref={ref}
        style={{ width, height }}
        className={styles.imageContainer}
      >
        <NudityBoundingBoxes
          ratio={ratio}
          src={image.resizedDataUrl ? image.resizedDataUrl : image.src}
        />
        {inView && (
          <img
            src={`file://${src}`}
            loading="lazy"
            alt={image.src}
            style={{ maxWidth: width + 4 }}
            onClick={handleImgClick}
            className={classNames(styles.image, {
              [styles.selected]: selected.includes(image.src),
              [styles.resized]: resized || !!image.resizedDataUrl,
            })}
          />
        )}

        <Controls
          image={image}
          showOriginal={showOriginal}
          setShowOriginal={setShowOriginal}
        />
      </div>

      {showOriginal && (
        <OriginalImage image={image} reset={() => setShowOriginal(false)} />
      )}
    </>
  );
};

const getDimensions = (image: ImageWithDefinitions, maxWidth: number) => {
  const extension = image.src.split('.').pop();
  const { width, height } = image.size;
  const isGifExtension = extension === 'gif';
  const isExceedingMaxWidth = width > maxWidth;

  if (isExceedingMaxWidth && !isGifExtension) {
    return {
      resized: true,
      width: maxWidth,
      ratio: maxWidth / width,
      height: Math.round((height / width) * maxWidth),
    };
  }

  // Handle animated images (.gif)
  const ratio = getGifRatio(width);
  return {
    ratio,
    resized: false,
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
};

const getGifRatio = (width: number) => {
  if (width >= 600) {
    return 1.2;
  } else if (width >= 500) {
    return 1.3;
  } else if (width >= 400) {
    return 1.5;
  }
  return 2;
};
