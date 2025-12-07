import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
// We assume a standard Vite project has an index.css that imports Tailwind
import './index.css'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);