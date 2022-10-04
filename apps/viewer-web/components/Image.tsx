/* eslint-disable @next/next/no-img-element */
import classNames from 'classnames';
import * as nsfwjs from 'nsfwjs';
import { Dispatch, FC, SetStateAction, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import styles from './Image.module.css';

export type BrowseResponse = {
  src: string;
  resizedDataUrl?: string;
  size: { width: number; height: number };
};

export type ImageWithDefinitions = BrowseResponse & {
  predictions: nsfwjs.predictionType[];
};

type LocalImageProps = {
  image: ImageWithDefinitions;
  nudityMap: Map<string, NudityResponse>;
  setNudityMap: Dispatch<SetStateAction<Map<string, NudityResponse>>>;
  showBoundingBox: boolean;
  selected: string[];
  index: number;
  setSelected: Dispatch<SetStateAction<string[]>>;
  handleSelect: (index: number) => (event: any) => void;
};

type NudityDetections = {
  bounding_box: number[];
  confidence: string;
  name: string;
};

type NudityOutput = {
  detections: NudityDetections[];
  nsfw_score: number;
};

export type NudityResponse = {
  id: string;
  output: NudityOutput;
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

export const LocalImage: FC<LocalImageProps> = ({
  image,
  showBoundingBox,
  nudityMap,
  setNudityMap,
  index,
  selected,
  setSelected,
  handleSelect,
}) => {
  const { ref, inView, entry } = useInView({
    threshold: 0,
  });

  const [maxWidth, setMaxWidth] = useState(600);

  const imgRef = useRef<HTMLImageElement>();

  const [showOriginal, setShowOriginal] = useState(false);
  const handleImgClick =
    (image: ImageWithDefinitions, index: number) => (e: any) => {
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

  const extension = image.src.split('.').pop();
  let resized = false;
  let { width, height } = image.size;
  let ratio = 1;
  if (width > maxWidth && extension !== 'gif') {
    height = (height / width) * maxWidth;
    ratio = maxWidth / width;
    width = maxWidth;
    resized = true;
  }

  const nudity = nudityMap.get(
    image.resizedDataUrl ? image.resizedDataUrl : image.src
  );

  const isSelected = selected.includes(image.src);
  return (
    <>
      {showOriginal && (
        <div className={styles.imageOriginal}>
          <img
            src={`file://${image.src}`}
            alt={image.src}
            onClick={() => setShowOriginal(false)}
          />
        </div>
      )}
      <div
        style={{ width, height }}
        className={classNames(styles.imageContainer, {
          [styles.hidden]: showOriginal,
        })}
      >
        {showBoundingBox &&
          !showOriginal &&
          nudity &&
          nudity.output &&
          nudity.output.detections.map((detection, index) => (
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
          className={classNames(styles.image, {
            [styles.resized]: resized || !!image.resizedDataUrl,
            [styles.selected]: isSelected,
          })}
          onClick={handleImgClick(image, index)}
        />

        {!(resized || !!image.resizedDataUrl) ? (
          <div className={classNames(styles.text, styles.sizeInfo)}>
            {width}x{height}
          </div>
        ) : (
          <button
            className={styles.openBig}
            onClick={() => {
              setShowOriginal(true);
            }}
          >
            Big
          </button>
        )}
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
      </div>
    </>
  );
};
