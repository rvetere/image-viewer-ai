import { useAppContext, useAppOperations } from '../context/appContext';
import { NudityResponse } from '../lib/types';

export const useNudityApi = () => {
  const { list, nudityMap } = useAppContext();
  const { setWorking, setNudityMap } = useAppOperations();
  const handleRunNudityApi = () => () => {
    setWorking(true);
    const toFetch = list
      .filter(
        (image) =>
          !nudityMap.get(
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
        const newNudityMap = new Map<string, NudityResponse>(nudityMap);
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
    handleRunNudityApi,
  };
};
