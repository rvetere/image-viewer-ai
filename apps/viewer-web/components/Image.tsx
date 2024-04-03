/* eslint-disable @next/next/no-img-element */
import classNames from 'classnames';
import {
  Dispatch,
  FC,
  MouseEventHandler,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useInView } from 'react-intersection-observer';
import { useImageContext, useImageOperations } from '../context/image.context';
import { ImageWithDefinitions } from '../context/types';
import styles from './Image.module.css';

type LocalImageProps = {
  index: number;
  image: ImageWithDefinitions;
};

export const LocalImage: FC<LocalImageProps> = ({ image, index }) => {
  const {
    uiState: { selected },
    nudityMap,
  } = useImageContext();
  const isSelected = selected.includes(image.src);

  const { setSelected, handleSelect } = useImageOperations();
  const { ref, inView } = useInView({
    threshold: 0,
  });

  const [maxWidth, setMaxWidth] = useState(600);
  const { width, height, ratio, resized } = getDimensions(image, maxWidth);

  const imgRef = useRef<HTMLImageElement>();

  const [showOriginal, setShowOriginal] = useState(false);
  const handleImgClick =
    (
      image: ImageWithDefinitions,
      index: number
    ): MouseEventHandler<HTMLImageElement> =>
    (e) => {
      handleSelect(index)(e);

      if (!e.shiftKey) {
        const alreadySelected = selected.includes(image.src);
        if (!alreadySelected) {
          setSelected([...selected, image.src]);
        } else {
          setSelected(selected.filter((src) => src !== image.src));
        }
      }

      const imagePath = image.resizedDataUrl ? image.resizedDataUrl : image.src;
      if (!nudityMap.has(imagePath)) {
        // window.electron.nudityAi(imagePath).then((result) => {
        //   setNudityMap((prev) => {
        //     const newMap = new Map(prev);
        //     newMap.set(imagePath, result);
        //     return newMap;
        //   });
        // });
      } else {
        console.log(nudityMap.get(imagePath));
      }
    };

  return (
    <>
      {showOriginal && (
        <OriginalImage image={image} reset={() => setShowOriginal(false)} />
      )}
      <div
        ref={ref}
        style={{ width, height }}
        className={styles.imageContainer}
      >
        <NudityBoundingBoxes
          src={image.resizedDataUrl ? image.resizedDataUrl : image.src}
          ratio={ratio}
        />
        {inView && (
          <img
            ref={imgRef}
            src={
              image.resizedDataUrl
                ? `file://${image.resizedDataUrl}`
                : `file://${image.src}`
            }
            style={{ maxWidth: width + 4 }}
            loading="lazy"
            alt={image.src}
            onClick={handleImgClick(image, index)}
            className={classNames(styles.image, {
              [styles.resized]: resized || !!image.resizedDataUrl,
              [styles.selected]: isSelected,
            })}
          />
        )}

        <Controls
          image={image}
          showOriginal={showOriginal}
          setShowOriginal={setShowOriginal}
        />
      </div>
    </>
  );
};

const getDimensions = (image: ImageWithDefinitions, maxWidth: number) => {
  const extension = image.src.split('.').pop();
  let resized = false;
  let { width, height } = image.size;
  let ratio = 1;
  if (width > maxWidth && extension !== 'gif') {
    height = Math.round((height / width) * maxWidth);
    ratio = maxWidth / width;
    width = maxWidth;
    resized = true;
  } else if (extension === 'gif') {
    ratio = 2;
    if (width >= 600) {
      ratio = 1.2;
    } else if (width >= 500) {
      ratio = 1.3;
    } else if (width >= 400) {
      ratio = 1.5;
    }
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  return { width, height, ratio, resized };
};

interface IControlsProps {
  image: ImageWithDefinitions;
  showOriginal: boolean;
  setShowOriginal: Dispatch<SetStateAction<boolean>>;
}

const Controls: FC<IControlsProps> = ({
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

const NudityBoundingBoxes: FC<{ src: string; ratio: number }> = ({
  src,
  ratio,
}) => {
  const {
    nudityMap,
    uiState: { showBoundingBox },
  } = useImageContext();
  const nudity = nudityMap.get(src);
  if (!showBoundingBox || !nudity || !nudity.output) {
    return null;
  }

  return (
    <>
      {nudity.output.detections.map((detection, index) => (
        <div
          key={`box-${index}`}
          className={styles.boundingBox}
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            border: `1px solid ${getBoundingBoxColor(index)}`,
            left: detection.bounding_box[0] * ratio,
            top: detection.bounding_box[1] * ratio,
            width: detection.bounding_box[2] * ratio,
            height: detection.bounding_box[3] * ratio,
          }}
        >
          <span>
            {detection.name}
            <sup>{detection.confidence}</sup>
          </span>
        </div>
      ))}
    </>
  );
};

const OriginalImage: FC<{ image: ImageWithDefinitions; reset: () => void }> = ({
  image,
  reset,
}) => {
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

const getBoundingBoxColor = (index: number) => {
  switch (index) {
    case 0:
      return 'red';
    default:
    case 1:
      return 'orange';
  }
};
