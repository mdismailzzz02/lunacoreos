import React from 'react';

const TABLER_ICONS = {
  'tabler-book': <path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0m-9 0v-14m-9 0a9 9 0 0 1 9 0a9 9 0 0 1 9 0v14" />,
  'tabler-school': <path d="M22 9l-10 -4l-10 4l10 4l10 -4zm-10 4v7m-6 -6v6a6 6 0 0 0 12 0v-6" />,
  'tabler-pencil': <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4m9 -9l4 4" />,
  'tabler-brain': <path d="M15.5 13a3.5 3.5 0 0 0 -3.5 3.5v1a3.5 3.5 0 0 0 7 0v-1.8m-4.667 -12.2a2 2 0 0 0 -1.833 -1h-2a2 2 0 0 0 -2 2v2m-6 3h2.5a2.5 2.5 0 0 0 2.5 -2.5v-1a2.5 2.5 0 0 0 -5 0v1m14.5 1v-1a2.5 2.5 0 0 0 -5 0v1a2.5 2.5 0 0 0 2.5 2.5h2.5m-11 5v1a2.5 2.5 0 0 0 5 0v-1a2.5 2.5 0 0 0 -2.5 -2.5h-2.5m10.833 3.5h-2.833a2 2 0 0 1 -2 -2v-1.5" />,
  'tabler-microscope': <path d="M5 21h14m-8 -3v3m-3 -11l3 3m2 -2l3 -3m-3 3l-1.5 -1.5a2 2 0 0 1 0 -2.828l.707 -.707a2 2 0 0 1 2.828 0l1.5 1.5m-3 3l-4 4a2 2 0 0 0 0 2.828l.707 .707a2 2 0 0 0 2.828 0l4 -4m-3 -3l-3 -3m4 -3l1.5 1.5" />,
  'tabler-barbell': <path d="M2 12h20m-18 -3v6m16 -6v6m-12 -2v2m8 -2v2m-8 -6v-2m8 2v-2" />,
  'tabler-heart': <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />,
  'tabler-run': <path d="M13 4m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0m-8.5 13.5l3.5 -4.5l-2 -3.5m10 5l-2.5 -3.5l-1.5 -3.5l-4 1.5m1.5 -6.5l3.5 2.5l3 -.5m-2.5 9.5l2.5 5" />,
  'tabler-droplet': <path d="M6.8 11a6 6 0 1 0 10.396 0l-5.197 -8l-5.2 8z" />,
  'tabler-yoga': <path d="M12 4m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0m-8 13l2 -3l5 -2m10 5l-2 -3l-5 -2m-2 -5l-2 3" />,
  'tabler-salad': <path d="M4 11h16m-12 -6l-2 6m12 -6l2 6m-13.6 1.4a8 8 0 0 0 15.2 0H6.4z" />,
  'tabler-briefcase': <path d="M3 7m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2zm5 -2v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2" />,
  'tabler-laptop': <path d="M3 19l18 0m-16 -4h14a2 2 0 0 0 2 -2v-8a2 2 0 0 0 -2 -2h-14a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2z" />,
  'tabler-chart-line': <path d="M4 19l16 0m-16 0v-14m16 4l-5 5l-4 -4l-7 7" />,
  'tabler-target': <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0m-3 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />,
  'tabler-folder': <path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" />,
  'tabler-clock': <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0m9 -4v4l2 2" />,
  'tabler-device-gamepad': <path d="M2 6m0 2a2 2 0 0 1 2 -2h16a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2zm4 6h4m-2 -2v4m10 -3v.01m-2 1.99v.01" />,
  'tabler-dice': <path d="M3 3m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2zm5 5.5m-.5 0a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0m6 0m-.5 0a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0m-6 6m-.5 0a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0m6 0m-.5 0a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0" />,
  'tabler-palette': <path d="M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25m-3.5 -13.5v.01m3 -2.01v.01m4 0v.01m3 2.01v.01" />,
  'tabler-music': <path d="M3 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0m10 0a3 3 0 1 0 6 0a3 3 0 0 0 -6 0m-10 0v-12h10v12m-10 -8h10" />,
  'tabler-camera': <path d="M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2zm7 3a3 3 0 1 0 0 6a3 3 0 0 0 0 -6" />,
  'tabler-guitar': <path d="M4.5 14.5l5 5m-5 -5l-1.5 -1.5a1.5 1.5 0 0 1 0 -2.1l8.5 -8.5a1.5 1.5 0 0 1 2.1 0l3.9 3.9a1.5 1.5 0 0 1 0 2.1l-8.5 8.5a1.5 1.5 0 0 1 -2.1 0l-1.5 -1.5" />,
  'tabler-home': <path d="M5 12l-2 0l9 -9l9 9l-2 0m-10 0v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2 -2v-7" />,
  'tabler-broom': <path d="M8 21l-3 -3l8 -8l3 3l-8 8zm4 -16l4 4m2 -2l-4 -4l2 -2l4 4z" />,
  'tabler-shopping-cart': <path d="M6 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0m11 0m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0m-15 -14h2l3.3 10.4c.1 .4 .5 .6 .9 .6h8.8c.4 0 .8 -.2 .9 -.6l2.1 -6.4h-14" />,
  'tabler-calendar': <path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2zm12 -4v4m-8 -4v4m-4 4h16" />,
  'tabler-plant': <path d="M7 15h10v4a2 2 0 0 1 -2 2h-6a2 2 0 0 1 -2 -2v-4zm5 -11v6m0 0a4 4 0 0 1 -4 -4v-2c2 0 4 2 4 4zm0 0a4 4 0 0 0 4 -4v-2c-2 0 -4 2 -4 4z" />,
  'tabler-car': <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0m10 0m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0m-13.8 -2h17.6l-1.5 -5h-14l-2 5zm2.5 -5l2 -5h7l2 5" />,
  'tabler-star': <path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z" />,
  'tabler-flag': <path d="M5 5a5 5 0 0 1 7 0a5 5 0 0 0 7 0v9a5 5 0 0 1 -7 0a5 5 0 0 0 -7 0v-9zm0 9v7" />,
  'tabler-check': <path d="M5 12l5 5l10 -10" />,
  'tabler-flame': <path d="M12 12c2 -2.96 0 -7 -1 -8c0 3.038 -1.773 4.741 -3 6c-1.226 1.26 -2 3.24 -2 5a6 6 0 1 0 12 0c0 -1.532 -1.056 -3.94 -2 -5c-1.786 3 -2.791 3 -4 2z" />,
  'tabler-bolt': <path d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11" />,
  'tabler-sparkles': <path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z" />,
  'tabler-clipboard': <path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2m-6 0a2 2 0 0 0 2 -2h2a2 2 0 0 0 2 2v0a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" />
};

export default function IconRenderer({ icon, className = "", style = {} }) {
  if (typeof icon === 'string' && icon.startsWith('tabler-')) {
    const path = TABLER_ICONS[icon];
    if (path) {
      return (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="100%" 
          height="100%" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={className}
          style={style}
        >
          {path}
        </svg>
      );
    }
  }

  // Fallback to text (emoji)
  return <span className={className} style={{...style, display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}}>{icon || '📋'}</span>;
}
