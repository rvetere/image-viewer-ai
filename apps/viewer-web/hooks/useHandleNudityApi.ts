import { Dispatch, SetStateAction } from 'react';
import { ImageWithDefinitions, NudityResponse } from '../components/Image';

type HandleNudityProps = {
  setWorking: (working: boolean) => void;
  list: ImageWithDefinitions[];
  setNudityMap: Dispatch<SetStateAction<Map<string, NudityResponse>>>;
};

export const useHandleNudityApi = ({
  setWorking,
  list,
  setNudityMap,
}: HandleNudityProps) => {
  const handleNudityApi = (_nudityMap: Map<string, NudityResponse>) => () => {
    setWorking(true);
    const toFetch = list
      .filter(
        (image) =>
          !_nudityMap.get(
            image.resizedDataUrl ? image.resizedDataUrl : image.src
          )
      )
      .map((image) =>
        image.resizedDataUrl ? image.resizedDataUrl : image.src
      );
    console.log({ toFetch });
    // @ts-expect-error bla
    window.electron
      .nudityAiBulk(toFetch.length > 100 ? toFetch.slice(0, 100) : toFetch)
      .then((results) => {
        const newNudityMap = new Map<string, NudityResponse>(_nudityMap);
        toFetch.forEach((src, index) => {
          const result = results[index];
          if (result && typeof result !== 'string') {
            newNudityMap.set(src, result);
          }
        });
        setNudityMap(newNudityMap);

        setWorking(false);

        console.log('new size of nudity map:', newNudityMap.size);

        // if (newNudityMap.size < list.length) {
        //   setTimeout(() => {
        //     handleNudityApi(newNudityMap)();
        //   }, 3000);
        // }
      });
  };
  return {
    handleNudityApi,
  };
};
