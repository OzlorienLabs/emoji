import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { registerServiceWorker } from './lib/pwa';
import './styles.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element was not found');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Only the production build has hashed, immutable assets worth caching; the dev
// server would otherwise serve stale modules.
void registerServiceWorker({ enabled: import.meta.env.PROD });
