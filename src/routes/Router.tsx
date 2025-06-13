import React, { useContext } from 'react';
import { Routes, Route, Navigate } from "react-router-dom";

// Importa o contexto para aceder ao estado de autenticação.
import { AuthContext } from '../api/AuthContext'; 

// Importa o layout principal que será usado pelas páginas protegidas.
import MainLayout from "../components/layout/MainLayout";

// Páginas
import Home from "../pages/Home";
import Clients from "../pages/Clients";
import Taxes from "../pages/Taxes";
import Settings from "../pages/Settings";
import OperationHistory from "../pages/OperationHistory";
import Notifications from "../pages/Notifications";
import ClientProfilePage from "../pages/ClientProfilePage";
import LoginPage from "../pages/LoginPage";

/**
 * @component AppRouter
 * Este componente é responsável por gerir toda a lógica de rotas da aplicação.
 * Utiliza o estado do `AuthContext` para decidir que página renderizar e para
 * proteger as rotas que exigem autenticação.
 */
const AppRouter: React.FC = () => {
  // Obtém o estado e as funções do contexto de autenticação.
  const authContext = useContext(AuthContext);

  // Salvaguarda para o caso de o contexto ainda não estar disponível.
  if (!authContext) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>A inicializar autenticação...</div>;
  }

  // Desestrutura os valores necessários do contexto.
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
          // Verifica se o utilizador está autenticado.
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
        // Se o utilizador estiver autenticado, redireciona para a home. Se não, para o login.
        element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
      />
    </Routes>
  );
};

export default AppRouter; // Exportar como AppRouter ou o nome que usaste no App.tsx