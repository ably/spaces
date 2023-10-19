import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { SlidesStateContextProvider } from './components/SlidesStateContext.tsx';
import Spaces from '@ably/spaces';
import { SpacesProvider, SpaceProvider } from '@ably/spaces/react';
import { Realtime } from 'ably';
import { nanoid } from 'nanoid';
import { generateSpaceName, getParamValueFromUrl } from './utils';
import { AblyProvider } from 'ably/react';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

const clientId = nanoid();

const client = new Realtime.Promise({
  authUrl: `/api/ably-token-request?clientId=${clientId}`,
  clientId,
});

const spaces = new Spaces(client);
const spaceName = getParamValueFromUrl('space', generateSpaceName);

root.render(
  <React.StrictMode>
    <AblyProvider client={client}>
      <SpacesProvider client={spaces}>
        <SpaceProvider
          name={spaceName}
          options={{ offlineTimeout: 10_000 }}
        >
          <SlidesStateContextProvider>
            <App />
          </SlidesStateContextProvider>
        </SpaceProvider>
      </SpacesProvider>
    </AblyProvider>
  </React.StrictMode>,
);
