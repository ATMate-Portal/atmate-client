import { useState, useEffect, useRef, useContext } from "react"; // <<< ADICIONAR useContext
import axios, { AxiosRequestConfig } from "axios";
import { AuthContext } from "../api/AuthContext"; // <<< IMPORTAR O TEU AuthContext (ajusta o caminho)

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ApiCallOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
  enabled?: boolean;
}

const useApi = <T,>(endpoint: string, options: ApiCallOptions = {}) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef<Map<string, T>>(new Map());
  const latestRequest = useRef<string | null>(null);

  const authContext = useContext(AuthContext); // <<< USAR O AuthContext

  useEffect(() => {
    const shouldFetch = options.enabled !== false && endpoint;
    if (!shouldFetch) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    const cacheKey = `${endpoint}:${JSON.stringify(options)}`; // Nota: JSON.stringify(options.body) pode ser grande para cacheKey

    if (cache.current.has(cacheKey)) {
      setData(cache.current.get(cacheKey)!);
      setLoading(false);
      setError(null);
      return;
    }

    if (latestRequest.current === cacheKey && loading) { // Evitar refetch se já estiver a carregar a mesma key
      return;
    }
    latestRequest.current = cacheKey;

    const fetchData = async () => {
      const { method = "GET", body } = options;
      
      // Obter o token do AuthContext ou localStorage
      const token = authContext?.token || localStorage.getItem('authToken');

      // Preparar os headers
      const requestHeaders: Record<string, string> = {
        'Accept': 'application/json', // Header comum para APIs JSON
        ...(options.headers || {}), // Adiciona headers passados nas options
      };

      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`; // <<< ADICIONAR O TOKEN JWT
      }
      
      // Adicionar Content-Type apenas se houver body (geralmente para POST, PUT, PATCH)
      if (body && !requestHeaders['Content-Type']) {
        requestHeaders['Content-Type'] = 'application/json';
      }


      const config: AxiosRequestConfig = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers: requestHeaders, // <<< USAR OS HEADERS ATUALIZADOS
        data: body,
        signal: controller.signal,
      };

      try {
        setLoading(true);
        setError(null); // Limpar erro anterior antes de novo fetch
        const response = await axios<T>(config);
        cache.current.set(cacheKey, response.data);
        setData(response.data);
      } catch (err: any) {
        if (axios.isCancel(err)) { // Melhor forma de verificar AbortError com Axios
            console.log("Request canceled:", err.message);
            return;
        }
        let errorMessage = err.message || "Erro ao buscar dados da API";
        if (err.response) {
            // O servidor respondeu com um status code fora do range 2xx
            errorMessage = `Erro ${err.response.status}: ${err.response.data?.message || err.response.data?.error || err.message}`;
            if ((err.response.status === 401 || err.response.status === 403) && authContext?.logout) {
                console.warn(`Erro de autenticação/autorização (${err.response.status}). A deslogar...`);
                // Considera deslogar apenas em 401 (Não Autorizado - token inválido/ausente)
                // 403 (Proibido) pode significar que o token é válido mas o user não tem permissão
                // authContext.logout(); // Descomenta com cuidado
            }
        } else if (err.request) {
            // O pedido foi feito mas não houve resposta
            errorMessage = "Sem resposta do servidor. Verifica a tua ligação ou a URL da API.";
        }
        // Algo aconteceu ao configurar o pedido que despoletou um erro
        setError(errorMessage);
        setData(null); // Limpar dados antigos em caso de erro
      } finally {
        setLoading(false);
      }
    };

    const controller = new AbortController();
    fetchData();

    return () => {
      controller.abort();
      latestRequest.current = null;
    };
    // Adiciona authContext.token às dependências para refazer o fetch se o token mudar (ex: após login/logout)
  }, [endpoint, options.method, options.headers, options.body, options.enabled, authContext?.token, authContext?.logout]); // authContext.logout para ESLint

  return { data, loading, error };
};

export default useApi;