import { Analytics } from '@vercel/analytics/react';
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

// Vercel Web Analytics rides alongside the app rather than inside it: on Vercel
// it self-hosts from /_vercel/insights, so no third-party origin is involved and
// the CSP stays as tight as it was.
createRoot(root).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
);

// Only the production build has hashed, immutable assets worth caching; the dev
// server would otherwise serve stale modules.
void registerServiceWorker({ enabled: import.meta.env.PROD });
