export const loadDataFromFileSystem = async (filePath: string) => {
  // @ts-expect-error bla
  const existing = await window.electron.getData(filePath);
  return existing ? JSON.parse(existing) : undefined;
};
