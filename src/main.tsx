import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const theme = localStorage.getItem('theme');
if (theme === 'light') {
  document.documentElement.classList.add('light');
  document.documentElement.classList.remove('dark');
} else {
  document.documentElement.classList.add('dark');
  document.documentElement.classList.remove('light');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
