import React from 'react';
import { createRoot } from 'react-dom/client';
import '@xyflow/react/dist/style.css';
import '@fontsource/vt323/latin-400.css';
import './styles.css';
import AccessGate from './AccessGate';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AccessGate />
  </React.StrictMode>
);
