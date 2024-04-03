import { useImageContext, useImageOperations } from '../context/image.context';
import { NudityResponse } from '../context/types';

export const useHandleNudityApi = () => {
  const { list } = useImageContext();
  const { setWorking, setNudityMap } = useImageOperations();
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
