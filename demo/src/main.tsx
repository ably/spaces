import React from 'react';
import ReactDOM from 'react-dom/client';
import { AblyProvider } from '@ably-labs/react-hooks';
import App from './App';
import './index.css';

import { ably, SpaceContextProvider } from './components';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <SpaceContextProvider>
      <AblyProvider client={ably}>
        <App />
      </AblyProvider>
    </SpaceContextProvider>
  </React.StrictMode>,
);
