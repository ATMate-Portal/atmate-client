// src/context/AuthContext.tsx
import React, { createContext, useState, ReactNode, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: any | null; // Define um tipo mais específico para o utilizador
  login: (newToken: string, userData?: any) => void;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Para verificar o token inicial

  useEffect(() => {
    // Verificar se existe um token no localStorage ao iniciar a app
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('userData');
    if (storedToken) {
      setToken(storedToken);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error("Failed to parse user data from localStorage", e);
          localStorage.removeItem('userData'); // Limpar dados inválidos
        }
      }
      // Aqui poderias adicionar uma chamada para validar o token com o backend
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, userData?: any) => {
    setToken(newToken);
    localStorage.setItem('authToken', newToken);
    if (userData) {
      setUser(userData);
      localStorage.setItem('userData', JSON.stringify(userData));
    }
    // Não é necessário redirecionar aqui, o componente de login fará isso.
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    // O redirecionamento para /login pode ser feito no componente que chama logout
    // ou através de uma rota protegida que redireciona se não autenticado.
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!token, token, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};