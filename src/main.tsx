import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Force-unregister old stale Service Workers and clear caches so iPad Safari always receives fresh updates
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      reg.unregister();
      console.log('Stale service worker unregistered for fresh reload');
    }
  });

  if (typeof window !== 'undefined' && 'caches' in window) {
    caches.keys().then((keys) => {
      for (const k of keys) {
        caches.delete(k);
        console.log('Stale cache deleted:', k);
      }
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
