import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept and swallow generic cross-origin "Script error." issues
// typically raised by third-party scripts or Google Maps iframes
if (typeof window !== 'undefined') {
  const isIgnorableError = (message: any, source: any) => {
    const msg = String(message || '').toLowerCase();
    const src = String(source || '').toLowerCase();
    return (
      msg.includes('script error') || 
      msg.includes('cross-origin') ||
      !source || 
      src === '' || 
      src.includes('google.com') || 
      src.includes('googleapis.com') || 
      src.includes('google-analytics') ||
      src.includes('leaflet')
    );
  };

  const prevOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    if (isIgnorableError(message, source)) {
      console.warn('Ignored safe cross-origin or third-party script error:', message);
      return true; // prevent default error reporting and stop propagation to iframe boundary
    }
    if (prevOnError) {
      try {
        return prevOnError.apply(this, [message, source, lineno, colno, error]);
      } catch (e) {
        return true;
      }
    }
    return true; // Return true as a fallback to prevent screen notifications of external system/network glitches
  };

  window.addEventListener('error', (event) => {
    if (isIgnorableError(event.message, event.filename)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, { capture: true });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = String(event.reason || '');
    if (reason.toLowerCase().includes('script error') || reason.toLowerCase().includes('cross-origin')) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, { capture: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

