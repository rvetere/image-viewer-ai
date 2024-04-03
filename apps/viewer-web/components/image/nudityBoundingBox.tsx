import { useImageContext } from '../../context/image.context';
import { FC } from 'react';
import styles from './nudityBoundingBox.module.css';

export const NudityBoundingBoxes: FC<{ src: string; ratio: number }> = ({
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

const getBoundingBoxColor = (index: number) => {
  switch (index) {
    case 0:
      return 'red';
    default:
    case 1:
      return 'orange';
  }
};
