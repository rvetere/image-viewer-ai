/* eslint-disable @next/next/no-img-element */
import classNames from 'classnames';
import { FunctionComponent, useState } from 'react';
import { useAppContext, useAppOperations } from '../../context/appContext';
import { useUiContext, useUiOperations } from '../../context/uiContext';
import { hashCode } from '../../lib/hashCode';
import { NudityResponse } from '../../lib/types';
import styles from './sidebar.module.css';

export const Sidebar: FunctionComponent = () => {
  const { images, nudityMap, browsingDir } = useAppContext();
  const { selected, subSelected, progress } = useUiContext();
  const { setImages, setNudityMap } = useAppOperations();
  const { setSelected, setSubSelected } = useUiOperations();

  const [sureToDelete, setSureToDelete] = useState(false);
  const handleDelete = () => {
    if (!sureToDelete) {
      setSureToDelete(true);
    } else {
      handleDeleteFinal();
    }
  };
  const handleDeleteFinal = () => {
    // @ts-expect-error bla
    window.electron.deleteImage(subSelected).then((results) => {
      const newNudityMap = new Map<string, NudityResponse>();
      for (const [key, value] of nudityMap.entries()) {
        if (!selected.includes(key)) {
          newNudityMap.set(key, value);
        }
      }
      setNudityMap(newNudityMap);

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
      // @ts-expect-error bla
      window.electron
        .storeData(`${hashCode(browsingDir)}.json`, JSON.stringify(newImages))
        .then((results) => {
          console.log('Stored data', { results });
        });
    });
  };
  const clearSelection = () => {
    setSelected([]);
    setSubSelected([]);
  };
  return (
    <div className={styles.sidebar}>
      <div>
        {selected.length > 0 && (
          <>
            <div className={styles.actions}>
              <button onClick={clearSelection}>Clear</button>
              {subSelected.length > 0 && (
                <button onClick={handleDelete}>
                  {sureToDelete ? 'Sure?' : 'Delete'}
                </button>
              )}
            </div>
            {selected.map((src) => {
              const image = images.find((image) => image.src === src);
              return (
                <img
                  key={src}
                  title={`${image.size.width}x${image.size.height}`}
                  src={`file://${image?.src}`}
                  alt={src}
                  className={classNames(styles.selectedImage, {
                    [styles.subSelected]: subSelected.includes(src),
                  })}
                  onClick={(event) => {
                    setSureToDelete(false);
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
          </>
        )}
        {progress > 0 && <div style={{ marginRight: 8 }}>{progress}%</div>}
      </div>
    </div>
  );
};
