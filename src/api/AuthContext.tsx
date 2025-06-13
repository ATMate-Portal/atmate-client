import React, { createContext, useState, ReactNode, useEffect } from "react";

/**
 * @interface AuthContextType
 * Define a estrutura dos dados e funções que o contexto de autenticação irá fornecer.
 */
interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: any | null;
  login: (newToken: string, userData?: any) => void;
  logout: () => void;
  isLoading: boolean;
}

/**
 * Criação do Contexto de Autenticação.
 */
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

/**
 * @interface AuthProviderProps
 * Define as propriedades do componente AuthProvider.
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * @component AuthProvider
 * Componente que envolve a aplicação e fornece o estado de autenticação.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  //Executado uma vez para validar a sessão existente.
  useEffect(() => {
    // Verificar se existe um token no localStorage ao iniciar a app
    const storedToken = localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("userData");
    if (storedToken) {
      // Se a validação for bem-sucedida, restaura o estado de autenticação.
      setToken(storedToken);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error("Failed to parse user data from localStorage", e);
          localStorage.removeItem("userData"); // Limpar dados inválidos
        }
      }
      // Aqui poderias adicionar uma chamada para validar o token com o backend
    }
    setIsLoading(false);
  }, []);

   /**
   * @function login
   * Autentica o utilizador, atualizando o estado, o header da API e o localStorage.
   */
  const login = (newToken: string, userData?: any) => {
    setToken(newToken);
    localStorage.setItem("authToken", newToken);
    if (userData) {
      setUser(userData);
      localStorage.setItem("userData", JSON.stringify(userData));
    }
    // Não é necessário redirecionar aqui, o componente de login fará isso.
  };

   /**
   * @function logout
   * Termina a sessão do utilizador, limpando o estado, o header da API e o localStorage.
   */
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        token,
        user,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
