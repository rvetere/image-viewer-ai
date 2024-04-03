import classNames from 'classnames';
import { LocalImage } from '../components/image/image';
import { Navigation } from '../components/navigation/navigation';
import { Sidebar } from '../components/sidebar/sidebar';
import { useAppContext } from '../context/appContext';
import styles from './homePage.module.css';

export const HomePage = () => {
  const { list, working } = useAppContext();
  return (
    <div className={classNames(styles.page, { [styles.working]: working })}>
      <div id="bigImagePortal" className={styles.bigImagePortal} />

      <Navigation />

      <div className={styles.layout}>
        <Sidebar />

        <div className={styles.list}>
          {list.map((image, index) => {
            return (
              <LocalImage
                key={`image-${image.src}`}
                index={index}
                image={image}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
