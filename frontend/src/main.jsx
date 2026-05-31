import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#1a1240',
            color: '#FCD34D',
            border: '1px solid rgba(252,211,77,.3)',
            fontWeight: 500,
            fontSize: 13,
          },
          success: { iconTheme: { primary: '#4ade80', secondary: '#1a1240' } },
          error:   { iconTheme: { primary: '#f87171', secondary: '#1a1240' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
