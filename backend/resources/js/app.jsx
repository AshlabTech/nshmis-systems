import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import AppRouter from './routes/index';

createRoot(document.getElementById('app')).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
);
