import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import SubjectDetail from './pages/SubjectDetail';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎓</div>
        <p style={{ color: '#64748B', fontSize: '14px' }}>Loading GradeTrack...</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes fadeInScale { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
          .animate-in { animation: fadeIn 0.3s ease forwards; }
          .animate-scale { animation: fadeInScale 0.25s ease forwards; }
          button { font-family: 'Plus Jakarta Sans', sans-serif; }
          input, select, textarea { font-family: 'Plus Jakarta Sans', sans-serif; }
          * { box-sizing: border-box; }
          
          @media (max-width: 768px) {
            .main-grid { grid-template-columns: 1fr !important; }
            .sidebar { display: none !important; }
          }
        `}</style>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/subject/:id" element={<PrivateRoute><SubjectDetail /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
