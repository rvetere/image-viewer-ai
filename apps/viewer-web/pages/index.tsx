import styles from './index.module.css';

export function Index() {
  const handleBrowse = () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    // const { ipcRenderer } = require('electron');
    // ipcRenderer.invoke('showDialog', 'message');
  };

  return (
    <div className={styles.page}>
      <button onClick={handleBrowse}>Browse</button>
    </div>
  );
}

export default Index;
