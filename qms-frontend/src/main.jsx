/**
 * Application Entry Point
 * Initializes React and wraps the app with providers
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AuthPage from './features/auth/AuthPage';
import { AppProvider, AppContext } from './context/AppContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

/**
 * Root component that handles auth routing
 */
const Root = () => {
  const { user, loading, apiStatus } = React.useContext(AppContext);

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth page if not logged in
  if (!user) {
    return <AuthPage />;
  }

  // Show main app if logged in
  return <App />;
};

/**
 * Render the application
 */
const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AppProvider>
        <Root />
      </AppProvider>
    </React.StrictMode>
  );
} else {
  console.error('Root element not found');
}
