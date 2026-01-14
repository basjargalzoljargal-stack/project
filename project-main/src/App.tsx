import { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { initializeStorage } from './utils/storage';
import { useAuth } from './contexts/AuthContext';

function AppContent() {
  const { isLoggedIn } = useAuth();
  const [showLogin, setShowLogin] = useState(!isLoggedIn);

  useEffect(() => {
    initializeStorage();
  }, []);

  useEffect(() => {
    setShowLogin(!isLoggedIn);
  }, [isLoggedIn]);

  const handleLogin = () => {
    setShowLogin(false);
  };

  const handleUnauthorized = () => {
    setShowLogin(true);
  };

  if (showLogin) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <ProtectedRoute onUnauthorized={handleUnauthorized}>
      <Dashboard onLogout={() => setShowLogin(true)} />
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
