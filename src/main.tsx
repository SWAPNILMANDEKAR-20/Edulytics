import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global Fetch Interceptor to inject Supabase JWT and email headers
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const userStr = localStorage.getItem('currentUser');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.token) {
        init = init || {};
        const headers = init.headers ? { ...init.headers } as any : {};
        headers['Authorization'] = `Bearer ${user.token}`;
        headers['x-user-email'] = user.email;
        init.headers = headers;
      }
    } catch (e) {
      console.error('Fetch interceptor failed to parse user:', e);
    }
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
