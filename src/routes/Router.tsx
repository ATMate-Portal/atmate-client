// src/routes/router.tsx
import React, { useContext } from 'react';
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

// Contexto de Autenticação
import { AuthContext } from '../api/AuthContext'; // <<< AJUSTA O CAMINHO se necessário

// Layouts
import MainLayout from "../components/layout/MainLayout";

// Páginas
import Home from "../pages/Home";
import Clients from "../pages/Clients";
import Taxes from "../pages/Taxes";
import Settings from "../pages/Settings";
import LogoutPage from "../pages/Logout"; // Renomeado para LogoutPage para clareza, se for uma página
import OperationHistory from "../pages/OperationHistory";
import Notifications from "../pages/Notifications";
import ClientProfilePage from "../pages/ClientProfilePage";
import LoginPage from "../pages/LoginPage";

// O componente ProtectedRoute pode ser simplificado ou a sua lógica integrada aqui.
// Para este exemplo, vamos assumir que a lógica de proteção é gerida diretamente
// com base no `isAuthenticated` do contexto.

const AppRouter: React.FC = () => { // Renomeado para AppRouter para evitar conflito com Router do react-router-dom
  const authContext = useContext(AuthContext);

  // Se o AuthContext ainda não foi carregado (raro, mas uma salvaguarda)
  if (!authContext) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>A inicializar autenticação...</div>;
  }

  const { isAuthenticated, isLoading } = authContext;

  // Mostrar ecrã de loading enquanto o AuthProvider verifica o estado de autenticação
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' }}>
        A carregar aplicação...
      </div>
    );
  }

  return (
    <Routes>
      {/* Rota de Login - Pública e sem MainLayout */}
      <Route
        path="/login"
        element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />}
      />

      {/* Rota wrapper para rotas protegidas que usam MainLayout */}
      {/* Esta rota verifica a autenticação. Se ok, renderiza MainLayout que por sua vez renderiza as rotas filhas via <Outlet />.
          Se não autenticado, redireciona para /login. */}
      <Route
        element={
          isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />
        }
      >
        {/* Todas as rotas abaixo são protegidas e usam o MainLayout */}
        <Route path="/" element={<Home />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientProfilePage />} />
        <Route path="/taxes" element={<Taxes />} />
        <Route path="/history" element={<OperationHistory />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
        {/* Adiciona outras rotas da aplicação aqui dentro */}
      </Route>

      {/* Rota de Fallback para caminhos não encontrados */}
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
      />
    </Routes>
  );
};

export default AppRouter; // Exportar como AppRouter ou o nome que usaste no App.tsx