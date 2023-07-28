import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { SpaceContextProvider } from './components/SpacesContext';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <SpaceContextProvider>
      <App />
    </SpaceContextProvider>
  </React.StrictMode>,
);
