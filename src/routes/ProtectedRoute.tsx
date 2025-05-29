import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

// Esta função deve verificar o estado de autenticação real
const useAuth = () => {
  // Exemplo: verifica se existe um token no localStorage
  const token = localStorage.getItem('userToken');
  return !!token; // Retorna true se o token existir, false caso contrário
};

const ProtectedRoute: React.FC = () => {
  const isAuthenticated = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;