import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './design-system/tokens.css';
import { initTheme } from './design-system/theme';
import { App } from './app/App';

initTheme();

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});
createRoot(document.getElementById('root')!).render(
  <React.StrictMode><QueryClientProvider client={client}><App /></QueryClientProvider></React.StrictMode>,
);
