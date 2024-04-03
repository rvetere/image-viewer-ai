import classNames from 'classnames';
import { Navigation } from '../components/navigation/navigation';
import { Sidebar } from '../components/sidebar/sidebar';
import { useAppContext } from '../context/appContext';
import { Browser } from './browser/browser';
import styles from './homePage.module.css';

export const HomePage = () => {
  const { working } = useAppContext();
  return (
    <div className={classNames(styles.page, { [styles.working]: working })}>
      <div id="bigImagePortal" className={styles.bigImagePortal} />

      <Navigation />

      <div className={styles.layout}>
        <Sidebar />
        <Browser />
      </div>
    </div>
  );
};
