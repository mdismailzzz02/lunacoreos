import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AudioProvider } from './context/AudioContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import './styles/global.css'
import './styles/animations.css'
import './styles/preloader.css'
import './styles/mobile.css'
import './styles/candy-theme.css'
import './styles/scifi-sidebar.css'

// ── Suppress expected Three.js deprecation warning from R3F ──
const origWarn = console.warn;
console.warn = (...args) => {
    if (args.length > 0 && typeof args[0] === 'string' && args[0].includes('THREE.Clock: This module has been deprecated')) return;
    origWarn(...args);
};

// ── Service Worker Registration ────────────────────────────────
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('[ServiceWorker] Registered', reg))
            .catch(err => console.error('[ServiceWorker] Registration failed', err));
    });
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <AudioProvider>
            <ToastProvider>
                <App />
            </ToastProvider>
        </AudioProvider>
    </React.StrictMode>
)

