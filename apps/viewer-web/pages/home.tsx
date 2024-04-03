import classNames from 'classnames';
import { useCallback, useEffect, useState } from 'react';
import { LocalImage } from '../components/Image';
import { Navigation } from '../components/navigation/navigation';
import { Sidebar } from '../components/sidebar/sidebar';
import { useDataHandling } from '../hooks/useDataHandling';
import styles from '../components/homePage.module.css';
import { ImageWithDefinitions } from '../context/types';

export function Index() {
  const {
    model,
    nudityMap,
    setNudityMap,
    storeNudityMap,
    favorites,
    setFavorites,
    browsingDir,
    handleBrowse,
    images,
    setImages,
    selected,
    setSelected,
    subSelected,
    setSubSelected,
    working,
    setWorking,
    progress,
  } = useDataHandling();

  const [filter, setFilter] = useState('sexyOnly');
  const [format, setFormat] = useState('all');
  const [onlyFaves, setOnlyFaves] = useState(false);
  const [showBoundingBox, setShowBoundingBox] = useState(true);

  const filterFormat = useCallback(
    (image) => {
      if (format === 'all') {
        return true;
      }
      const extension = image.src.split('.').pop();
      if (format === 'gifsOnly') {
        return extension === 'gif';
      } else if (format === 'staticOnly') {
        return extension !== 'gif';
      }
    },
    [format]
  );

  const filterNudity = useCallback(
    (search, isSexy, neutral) => (image) => {
      const nudity = nudityMap.get(
        image.resizedDataUrl ? image.resizedDataUrl : image.src
      );
      if (nudity) {
        const check =
          nudity.output &&
          nudity.output.detections.find((d) =>
            d.name.toLowerCase().includes(search)
          );
        return (
          isSexy &&
          neutral.probability < 0.3 &&
          check &&
          parseFloat(check.confidence) > 0.67 &&
          filterFormat(image)
        );
      }
      return false;
    },
    [filterFormat, nudityMap]
  );

  const filterFn = useCallback(
    (image) => {
      setSelected([]);
      setSubSelected([]);
      const withOnlyFave = onlyFaves ? favorites.includes(image.src) : true;
      const neutral = image.predictions.find((p) => p.className === 'Neutral');
      const sexy = image.predictions.find((p) => p.className === 'Sexy');
      const hentai = image.predictions.find((p) => p.className === 'Hentai');
      const porn = image.predictions.find((p) => p.className === 'Porn');
      const isSexy =
        (sexy && sexy.probability >= 0.4) ||
        (hentai && hentai.probability >= 0.4) ||
        (porn && porn.probability >= 0.4);

      if (filter === 'all') {
        return true && filterFormat(image) && withOnlyFave;
      } else if (filter === 'buttocksOnly') {
        return filterNudity('buttocks', isSexy, neutral)(image) && withOnlyFave;
      } else if (filter === 'breastsOnly') {
        return filterNudity('breast', isSexy, neutral)(image) && withOnlyFave;
      } else if (filter === 'sexyOnly') {
        return (
          isSexy &&
          neutral.probability < 0.3 &&
          filterFormat(image) &&
          withOnlyFave
        );
      } else {
        // word filter
        const nudity = nudityMap.get(
          image.resizedDataUrl ? image.resizedDataUrl : image.src
        );
        if (nudity) {
          const check =
            nudity.output &&
            nudity.output.detections.find((d) => d.name.includes(filter));
          return (
            isSexy &&
            neutral.probability < 0.3 &&
            check &&
            parseFloat(check.confidence) > 0.67 &&
            filterFormat(image) &&
            withOnlyFave
          );
        }
        return false;
      }
    },
    [filter, format, onlyFaves]
  );

  const sortWithFilter =
    (search: string) => (a: ImageWithDefinitions, b: ImageWithDefinitions) => {
      const aNudity = nudityMap.get(
        a.resizedDataUrl ? a.resizedDataUrl : a.src
      );
      const bNudity = nudityMap.get(
        b.resizedDataUrl ? b.resizedDataUrl : b.src
      );
      if (aNudity && bNudity) {
        const aCheck = aNudity.output.detections.find((d) =>
          d.name.toLowerCase().includes(search)
        );
        const bCheck = bNudity.output.detections.find((d) =>
          d.name.toLowerCase().includes(search)
        );
        if (aCheck && bCheck) {
          return parseFloat(bCheck.confidence) - parseFloat(aCheck.confidence);
        }
      }
    };

  const [list, setList] = useState<ImageWithDefinitions[]>([]);
  useEffect(() => {
    setList(
      images
        .filter(filterFn)
        .sort((a, b) => {
          const sizeA = a.size.width * a.size.height;
          const sizeB = b.size.width * b.size.height;
          if (sizeA > sizeB) {
            return -1;
          } else if (sizeA < sizeB) {
            return 1;
          }
          return 0;
        })
        .sort((a, b) => {
          if (filter === 'buttocksOnly') {
            return sortWithFilter('buttocks')(a, b);
          } else if (filter === 'breastsOnly') {
            return sortWithFilter('breast')(a, b);
          } else if (filter !== 'all' && filter !== 'sexyOnly') {
            return sortWithFilter(filter)(a, b);
          }
          return 0;
        })
    );
  }, [filter, format, images.length, onlyFaves]);

  const [selectStartIndex, setSelectStartIndex] = useState(-1);
  const handleSelect = (index: number) => (event: any) => {
    if (selectStartIndex === -1) {
      setSelectStartIndex(index);
    } else if (event.shiftKey) {
      const newSelected = list
        .filter((image, idx) => idx >= selectStartIndex && idx <= index)
        .map((image) => image.src);
      setSelected(newSelected);
    }
  };

  return (
    <div className={classNames(styles.page, { [styles.working]: working })}>
      <div id="bigImagePortal" className={styles.bigImagePortal} />

      <Navigation
        model={model}
        handleBrowse={handleBrowse}
        showBoundingBox={showBoundingBox}
        setShowBoundingBox={setShowBoundingBox}
        list={list}
        filter={filter}
        setFilter={setFilter}
        format={format}
        setFormat={setFormat}
        setWorking={setWorking}
        nudityMap={nudityMap}
        setNudityMap={setNudityMap}
        onlyFaves={onlyFaves}
        setOnlyFaves={setOnlyFaves}
      />

      <div className={styles.layout}>
        <Sidebar
          dir={browsingDir}
          subSelected={subSelected}
          storeNudityMap={storeNudityMap}
          images={images}
          nudityMap={nudityMap}
          progress={progress}
          selected={selected}
          setImages={setImages}
          setSelected={setSelected}
          setSubSelected={setSubSelected}
        />

        <div className={styles.list}>
          {list.map((image, index) => (
            <LocalImage
              key={`image-${index}`}
              index={index}
              image={image}
              favorites={favorites}
              setFavorites={setFavorites}
              nudityMap={nudityMap}
              setNudityMap={setNudityMap}
              selected={selected}
              setSelected={setSelected}
              showBoundingBox={showBoundingBox}
              handleSelect={handleSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Index;
