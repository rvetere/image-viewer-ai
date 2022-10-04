/* eslint-disable @next/next/no-img-element */
import classNames from 'classnames';
import { Dispatch, FC, SetStateAction } from 'react';
import { ImageWithDefinitions, NudityResponse } from '../Image';
import styles from './sidebar.module.css';

type SidebarProps = {
  selected: string[];
  images: ImageWithDefinitions[];
  nudityMap: Map<string, NudityResponse>;
  setSelected: Dispatch<SetStateAction<string[]>>;
  subSelected: string[];
  setSubSelected: Dispatch<SetStateAction<string[]>>;
  setImages: Dispatch<SetStateAction<ImageWithDefinitions[]>>;
  storeNudityMap: (_nudityMap: Map<string, NudityResponse>) => void;
  progress: number;
};

export const Sidebar: FC<SidebarProps> = ({
  images,
  selected,
  nudityMap,
  subSelected,
  storeNudityMap,
  setImages,
  setSelected,
  setSubSelected,
  progress,
}) => {
  const handleDelete = () => {
    // @ts-expect-error bla
    window.electron.deleteImage(subSelected).then((results) => {
      const newNudityMap = new Map<string, NudityResponse>();
      for (const [key, value] of nudityMap.entries()) {
        if (!selected.includes(key)) {
          newNudityMap.set(key, value);
        }
      }
      storeNudityMap(newNudityMap);

      const newSubSelected = subSelected.filter(
        (src) => !subSelected.includes(src)
      );
      setSubSelected(newSubSelected);
      const newSelected = selected.filter((src) => !subSelected.includes(src));
      setSelected(newSelected);
      const newImages = images.filter(
        (image) => !subSelected.includes(image.src)
      );
      setImages(newImages);
    });
  };
  return (
    <div className={styles.sidebar}>
      <div>
        {selected.length > 0 && (
          <>
            {selected.map((src) => {
              const image = images.find((image) => image.src === src);
              return (
                <img
                  key={src}
                  title={`${image.size.width}x${image.size.height}`}
                  src={`file://${image?.resizedDataUrl || image?.src}`}
                  alt={src}
                  className={classNames(styles.selectedImage, {
                    [styles.subSelected]: subSelected.includes(src),
                  })}
                  onClick={(event: any) => {
                    if (event.shiftKey) {
                      const alreadySelected = selected.includes(src);
                      if (!alreadySelected) {
                        setSelected([...selected, src]);
                      } else {
                        setSelected(selected.filter((_src) => _src !== src));
                      }
                    } else {
                      const isSelected = subSelected.includes(src);
                      if (!isSelected) {
                        setSubSelected([...subSelected, src]);
                      } else {
                        setSubSelected(subSelected.filter((s) => s !== src));
                      }
                    }
                  }}
                />
              );
            })}
            {subSelected.length > 0 && (
              <div>
                <button onClick={handleDelete}>Delete</button>
              </div>
            )}
          </>
        )}
        {progress > 0 && <div style={{ marginRight: 8 }}>{progress}%</div>}
      </div>
    </div>
  );
};
