import { AppProps } from 'next/app';
import Head from 'next/head';
import './styles.css';
import { AppContextProvider } from '../context/appContext';
import { UiContextProvider } from '../context/uiContext';

function CustomApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Welcome to viewer-web!</title>
      </Head>
      <main className="app">
        <AppContextProvider>
          <UiContextProvider>
            <Component {...pageProps} />
          </UiContextProvider>
        </AppContextProvider>
      </main>
    </>
  );
}

export default CustomApp;
