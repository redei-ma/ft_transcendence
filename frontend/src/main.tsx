import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Controlla il build hash prima di montare React: forza reload se il client è outdated.
// __BUILD_HASH__ è iniettato da Vite al build time; /build-hash.json è il file del deploy corrente.
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
