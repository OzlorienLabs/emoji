import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initAnalytics } from './lib/analytics';
import { registerServiceWorker } from './lib/pwa';
import './styles.css';

// Initialize Google Analytics 4 if VITE_GA_MEASUREMENT_ID is provided
initAnalytics();

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
