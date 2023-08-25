import React from 'react';
import ReactDOM from 'react-dom/client';
import { AblyProvider } from '@ably-labs/react-hooks';
import App from './App';
import './index.css';

import { ably, SpaceContextProvider } from './components';
import { SlidesStateContextProvider } from './components/SlidesStateContext.tsx';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <SpaceContextProvider>
      <AblyProvider client={ably}>
        <SlidesStateContextProvider>
          <App />
        </SlidesStateContextProvider>
      </AblyProvider>
    </SpaceContextProvider>
  </React.StrictMode>,
);
