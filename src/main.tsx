import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Service Worker for offline support (production only, clean unregister in development)
if ('serviceWorker' in navigator) {
  if (((import.meta as any).env && (import.meta as any).env.DEV) || window.location.host.includes('localhost') || window.location.host.includes('run.app')) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
        console.log('Development environment detected: Unregistered stale ServiceWorker:', registration.scope);
      }
    });
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('InvoicePe ServiceWorker registered successfully with scope: ', registration.scope);
        })
        .catch((error) => {
          console.error('InvoicePe ServiceWorker registration failed: ', error);
        });
    });
  }
}

