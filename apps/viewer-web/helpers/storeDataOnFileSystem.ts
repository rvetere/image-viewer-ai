export const storeDataOnFileSystem = (targetPath: string, content: string) => {
  return new Promise((resolve, reject) => {
    // @ts-expect-error bla
    window.electron.storeData(targetPath, content).then((results) => {
      if (results) {
        return resolve(true);
      }
      console.error('Failed to store data');
      reject('Failed to store data');
    });
  });
};
