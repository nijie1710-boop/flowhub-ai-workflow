import { useEffect } from 'react';
import componentScriptUrl from './workflow-components.js?url';
import legacyAppUrl from '../lib/flowhub-app.js?url';

function loadClassicScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-flowhub-legacy="${src}"]`);
    if (existing) {
      resolve(existing);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.dataset.flowhubLegacy = src;
    script.onload = () => resolve(script);
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

export default function LegacyRuntime() {
  useEffect(() => {
    if (window.__flowhubLegacyRuntimeLoaded) return;
    window.__flowhubLegacyRuntimeLoaded = true;

    loadClassicScript(componentScriptUrl)
      .then(() => loadClassicScript(legacyAppUrl))
      .catch((err) => {
        console.error('[FlowHub] Legacy runtime failed:', err);
      });
  }, []);

  return null;
}
