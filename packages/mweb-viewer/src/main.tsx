/**
 * Mweb Viewer Entry Point
 *
 * Self-contained React app for .mweb export bundles.
 * No Electron, no router, no IPC — pure browser.
 *
 * Loads data.json from the same folder and renders the instruction
 * using the same InstructionView component as the Electron app.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import './index.css';

// Override the dark body/canvas from index.css so the card floats
// with no visible background (iframe/page background shows through).
// color-scheme: normal prevents the browser from painting a dark canvas
// when the body is transparent (index.css sets color-scheme: dark on :root).
document.documentElement.style.colorScheme = 'normal';
document.body.style.background = 'transparent';
document.body.style.overflow = 'hidden';
document.body.style.minHeight = 'auto';
document.getElementById('root')!.style.minHeight = 'auto';

import { MwebApp } from './MwebApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MwebApp />
  </StrictMode>,
);
