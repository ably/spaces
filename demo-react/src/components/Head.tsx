import { Helmet } from 'react-helmet';

export const Head = () => {
  return (
    <Helmet>
      <title>Spaces Demo</title>
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
      />
      <meta charSet="utf-8" />
      <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
      />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin=""
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
    </Helmet>
  );
};
