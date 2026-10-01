import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { SlidesStateContextProvider } from './components/SlidesStateContext.tsx';
import { createSpacesClient } from '@ably/spaces';
import { SpacesProvider, SpaceProvider } from '@ably/spaces/react';
import { createClient } from '@ably/pubsub-device';
import { nanoid } from 'nanoid';
import { generateSpaceName, getParamValueFromUrl } from './utils';
import { PubSubClientProvider } from '@ably/pubsub-device/react';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

const clientId = nanoid();

const client = createClient({
  authUrl: `/api/ably-token-request?clientId=${clientId}`,
  clientId,
});

const spaces = createSpacesClient(client);
const spaceName = getParamValueFromUrl('space', generateSpaceName);

root.render(
  <React.StrictMode>
    <PubSubClientProvider client={client}>
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
    </PubSubClientProvider>
  </React.StrictMode>,
);
