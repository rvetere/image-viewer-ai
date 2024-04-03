import { AppProps } from 'next/app';
import Head from 'next/head';
import './styles.css';
import { ImageContextProvider } from '../context/image.context';

function CustomApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Welcome to viewer-web!</title>
      </Head>
      <main className="app">
        <ImageContextProvider>
          <Component {...pageProps} />
        </ImageContextProvider>
      </main>
    </>
  );
}

export default CustomApp;
