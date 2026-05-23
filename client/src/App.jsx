import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingV2 from './pages/LandingV2';
import Auth from './pages/Auth';
import Workspace from './pages/Workspace';
import WorkspaceChat from './pages/WorkspaceChat';
import Features from './pages/Features';
import Roast from './pages/Roast';
import Review from './pages/Review';
import Interview from './pages/Interview';
import Focus from './pages/Focus';
import Profile from './pages/Profile';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e1e24', color: '#fff' } }} />
      <Routes>
        <Route path="/" element={<LandingV2 />} />
        <Route path="/features" element={<Features />} />
        <Route path="/auth" element={user ? <Navigate to="/workspace" /> : <Auth />} />
        <Route path="/dashboard" element={<Navigate to="/workspace" />} />
        <Route path="/workspace" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
        <Route path="/workspace/chat" element={<ProtectedRoute><WorkspaceChat /></ProtectedRoute>} />
        <Route path="/roast" element={<ProtectedRoute><Roast /></ProtectedRoute>} />
        <Route path="/code-review" element={<ProtectedRoute><Review /></ProtectedRoute>} />
        <Route path="/interview" element={<ProtectedRoute><Interview /></ProtectedRoute>} />
        <Route path="/focus" element={<ProtectedRoute><Focus /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
