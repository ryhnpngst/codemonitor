import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { TeacherDashboardPage } from './pages/TeacherDashboardPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { ProtectedRoute } from './components/ProtectedRoute';

const RootRedirect: React.FC = () => {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={profile.role === 'teacher' ? '/teacher' : '/student'} replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Teacher Routes */}
          <Route
            path="/teacher/*"
            element={
              <ProtectedRoute allowedRole="teacher">
                <TeacherDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Student Routes */}
          <Route
            path="/student/*"
            element={
              <ProtectedRoute allowedRole="student">
                <StudentDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Root / Default Redirect */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

