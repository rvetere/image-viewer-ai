/* eslint-disable @next/next/no-img-element */
import classNames from 'classnames';
import { FunctionComponent, useState } from 'react';
import { useAppContext, useAppOperations } from '../../context/appContext';
import { hashCode } from '../../lib/hashCode';
import styles from './sidebar.module.css';

export const Sidebar: FunctionComponent = () => {
  const { selected, subSelected, progress, browsingData, browsingDir } =
    useAppContext();
  const { setSelected, setSubSelected, setBrowsingData } = useAppOperations();

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
      const newSubSelected = subSelected.filter(
        (src) => !subSelected.includes(src)
      );
      setSubSelected(newSubSelected);
      const newSelected = selected.filter((src) => !subSelected.includes(src));
      setSelected(newSelected);
      const newImages = browsingData.filter(
        (image) => !subSelected.includes(image.src)
      );
      setBrowsingData(newImages);
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
              const image = browsingData.find((image) => image.src === src);
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
