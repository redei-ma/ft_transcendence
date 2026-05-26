import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

async function checkVersion(): Promise<void> {
  try {
    const resp = await fetch('/build-hash.json', { cache: 'no-store' });
    if (!resp.ok) return;
    const { hash } = await resp.json() as { hash: string };
    if (hash !== __BUILD_HASH__) {
      window.location.href = '/?_v=' + hash;
    }
  } catch {
    // network error: proceed normally
  }
}

checkVersion().then(() => {
  if (window.location.search.startsWith('?_v=')) {
    window.history.replaceState(null, '', window.location.pathname);
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <App />
  );
});
