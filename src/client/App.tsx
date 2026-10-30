import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ParticipantAppPage } from './pages/ParticipantAppPage';
import { PublicOverviewPage } from './pages/PublicOverviewPage';
import { PublicRankingPage } from './pages/PublicRankingPage';
import { RegisterPage } from './pages/RegisterPage';

const RequireParticipantAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-600">
        Verificando sessão...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'PARTICIPANT') return <Navigate to="/admin" replace />;
  return children;
};

const RequireStaffAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-600">
        Verificando credenciais administrativas...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'PARTICIPANT') return <Navigate to="/app" replace />;
  return children;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Páginas Públicas */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/inscricao" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/ranking" element={<PublicRankingPage />} />
          <Route path="/acompanhamento" element={<PublicOverviewPage />} />

          {/* Ambiente Gamificado do Aluno / Colaborador */}
          <Route
            path="/app/*"
            element={
              <RequireParticipantAuth>
                <ParticipantAppPage />
              </RequireParticipantAuth>
            }
          />

          {/* Painel Administrativo e Central do Avaliador */}
          <Route
            path="/admin/*"
            element={
              <RequireStaffAuth>
                <AdminDashboardPage />
              </RequireStaffAuth>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

