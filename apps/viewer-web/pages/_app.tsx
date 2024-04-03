import { AppProps } from 'next/app';
import Head from 'next/head';
import './styles.css';
import { AppContextProvider } from '../context/appContext';
import { FilterContextProvider } from '../context/filterContext';

function CustomApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Welcome to viewer-web!</title>
      </Head>
      <main className="app">
        <AppContextProvider>
          <FilterContextProvider>
            <Component {...pageProps} />
          </FilterContextProvider>
        </AppContextProvider>
      </main>
    </>
  );
}

export default CustomApp;
