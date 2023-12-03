import Head from 'next/head';
import './styles.css'

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>SIMS - MFD Autonomous</title>
          <link rel="preconnect" href="https://fonts.gstatic.com" />
          <link href="https://fonts.googleapis.com/css2?family=Rubik&display=swap" rel="stylesheet" />
      </Head>
      
      <Component {...pageProps} />
    </>
  )
}