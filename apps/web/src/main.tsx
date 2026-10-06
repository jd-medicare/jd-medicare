import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './design-system/tokens.css';
import { App } from './app/App';
const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 15_000 } } });
createRoot(document.getElementById('root')!).render(
  <React.StrictMode><QueryClientProvider client={client}><App /></QueryClientProvider></React.StrictMode>,
);
