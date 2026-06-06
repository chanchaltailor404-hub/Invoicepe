import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Service Worker for offline support
if ('serviceWorker' in navigator) {
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

