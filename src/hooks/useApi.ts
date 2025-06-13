import { useState, useEffect, useRef, useContext } from "react"; // <<< ADICIONAR useContext
import axios, { AxiosRequestConfig } from "axios";
// Importa o AuthContext para aceder ao estado de autenticação e às suas funções.
import { AuthContext } from "../api/AuthContext";
import { useNavigate } from "react-router-dom";

// A URL base da API, obtida a partir das variáveis de ambiente do Vite.
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * @interface ApiCallOptions
 * Define as opções de configuração que podem ser passadas ao hook `useApi`
 * para customizar a chamada à API.
 */
interface ApiCallOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE"; // O método HTTP a ser utilizado.
  headers?: Record<string, string>; // Cabeçalhos adicionais para a requisição.
  body?: any; // O corpo da requisição (para POST, PUT, etc.).
  enabled?: boolean; // Se 'false', a chamada à API não é executada. Útil para chamadas condicionais.
}

/**
 * @hook useApi
 * Um hook customizado para realizar chamadas a uma API de forma declarativa.
 * Abstrai a lógica de loading, erro, cache e tratamento de autenticação.
 * @template T - O tipo de dados esperado na resposta da API.
 * @param {string} endpoint - O caminho do endpoint da API (ex: '/users').
 * @param {ApiCallOptions} options - Opções para configurar a chamada.
 * @returns Um objeto com `data`, `loading` e `error`.
 */
const useApi = <T>(endpoint: string, options: ApiCallOptions = {}) => {
  // Estados para gerir o ciclo de vida da requisição.
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // useRef para implementar um sistema de cache simples em memória e evitar requisições repetidas.
  const cache = useRef<Map<string, T>>(new Map());
  // useRef para controlar a última requisição feita e evitar fetches duplicados.
  const latestRequest = useRef<string | null>(null);

  // Acesso ao contexto de autenticação e à função de navegação do React Router.
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();

  // Executa a chamada à API sempre que as suas dependências mudam.
  useEffect(() => {
    // A chamada só é feita se o hook estiver habilitado (`enabled !== false`) e se houver um endpoint.
    const shouldFetch = options.enabled !== false && endpoint;
    if (!shouldFetch) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Cria uma chave única para a cache baseada no endpoint e nas opções da requisição.
    const cacheKey = `${endpoint}:${JSON.stringify(options)}`;

    // Se os dados já existirem na cache, retorna-os imediatamente.
    if (cache.current.has(cacheKey)) {
      setData(cache.current.get(cacheKey)!);
      setLoading(false);
      setError(null);
      return;
    }

    // Evita refetch se uma requisição idêntica já estiver em andamento.
    if (latestRequest.current === cacheKey && loading) {
      return;
    }
    latestRequest.current = cacheKey;

    const fetchData = async () => {
      const { method = "GET", body } = options;

      // Obtém o token do contexto de autenticação para injetar na requisição.
      const token = authContext?.token || localStorage.getItem("authToken");

      // Prepara os cabeçalhos da requisição.
      const requestHeaders: Record<string, string> = {
        Accept: "application/json",
        ...(options.headers || {}),
      };

      // Se existir um token, adiciona-o ao cabeçalho de Autorização.
      if (token) {
        requestHeaders["Authorization"] = `Bearer ${token}`;
      }

      // Adiciona o Content-Type 'application/json' se houver um corpo na requisição.
      if (body && !requestHeaders["Content-Type"]) {
        requestHeaders["Content-Type"] = "application/json";
      }

      // Configuração final do objeto de requisição para o Axios.
      const config: AxiosRequestConfig = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers: requestHeaders,
        data: body,
        signal: controller.signal,
      };

      try {
        setLoading(true);
        setError(null); 

        const response = await axios<T>(config);

        // Em caso de sucesso, guarda a resposta na cache e atualiza o estado.
        cache.current.set(cacheKey, response.data);
        setData(response.data);
      } catch (err: any) {
        if (axios.isCancel(err)) {
          console.log("Request canceled:", err.message);
          return;
        }

        let errorMessage = err.message || "Erro ao buscar dados da API";

        if (err.response) {
          // Trata erros vindos da resposta da API (status code != 2xx).
          errorMessage = `Erro ${err.response.status}: ${
            err.response.data?.message ||
            err.response.data?.error ||
            err.message
          }`;
          // Se o erro for de autenticação (401), desloga o utilizador e redireciona para o login.
          if ((err.response.status === 401 || err.response.status === 403) && authContext?.logout) {
            console.warn(
              `Erro de autenticação/autorização (${err.response.status}). A deslogar...`
            );
            authContext.logout();
            navigate("/login");
          }
        } else if (err.request) {
          // O pedido foi feito mas não houve resposta
          errorMessage = "Sem resposta do servidor. Verifica a tua ligação ou a URL da API.";
        }

        setError(errorMessage);
        setData(null); // Limpar dados antigos em caso de erro
      } finally {
        setLoading(false);
      }
    };

    // AbortController para permitir o cancelamento da requisição se o componente for desmontado.
    const controller = new AbortController();
    fetchData();

    // Função de limpeza: é executada quando o componente é desmontado.
    return () => {
      controller.abort();
      latestRequest.current = null;
    };
    // Dependências do useEffect: o efeito será re-executado se alguma destas propriedades mudar.
  }, [
    endpoint,
    options.method,
    options.headers,
    options.body,
    options.enabled,
    authContext?.token,
    authContext?.logout,
  ]); // authContext.logout para ESLint

  return { data, loading, error };
};

export default useApi;
