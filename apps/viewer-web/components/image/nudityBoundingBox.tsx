import { ImageWithDefinitions } from 'apps/viewer-web/lib/types';
import { FunctionComponent } from 'react';
import { useFilterContext } from '../../context/filterContext';
import styles from './nudityBoundingBox.module.css';

export const NudityBoundingBoxes: FunctionComponent<{
  image: ImageWithDefinitions;
  ratio: number;
}> = ({ image, ratio }) => {
  const { showBoundingBox } = useFilterContext();
  if (!showBoundingBox) {
    return null;
  }

  return (
    <>
      {image.predictions?.parts.map(({ box, class: label, score }, index) => (
        <div
          key={`box-${index}`}
          className={styles.boundingBox}
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            border: `1px solid ${getBoundingBoxColor(index)}`,
            left: box[0] * ratio,
            top: box[1] * ratio,
            width: box[2] * ratio,
            height: box[3] * ratio,
          }}
        >
          <span>
            {label}
            <sup>{score}</sup>
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
