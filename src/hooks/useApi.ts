import { useState, useEffect, useRef } from "react";
import axios, { AxiosRequestConfig } from "axios";

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
  const cache = useRef<Map<string, T>>(new Map()); // Cache para respostas
  const latestRequest = useRef<string | null>(null); // Rastrear última requisição

  useEffect(() => {
    const shouldFetch = options.enabled !== false && endpoint;
    if (!shouldFetch) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Gerar chave única para cache baseada em endpoint e opções
    const cacheKey = `${endpoint}:${JSON.stringify(options)}`;

    // Verificar cache
    if (cache.current.has(cacheKey)) {
      setData(cache.current.get(cacheKey)!);
      setLoading(false);
      setError(null);
      return;
    }

    // Evitar chamadas duplicadas para a mesma requisição
    if (latestRequest.current === cacheKey) {
      return;
    }
    latestRequest.current = cacheKey;

    const fetchData = async () => {
      const { method = "GET", headers, body } = options;
      const config: AxiosRequestConfig = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers,
        data: body,
        signal: controller.signal, // Para cancelamento
      };

      try {
        setLoading(true);
        const response = await axios<T>(config);
        cache.current.set(cacheKey, response.data); // Armazenar no cache
        setData(response.data);
        setError(null);
      } catch (err: any) {
        if (err.name === "AbortError") return; // Ignorar erros de cancelamento
        setError(err.message || "Erro ao buscar dados da API");
      } finally {
        setLoading(false);
      }
    };

    const controller = new AbortController();
    fetchData();

    // Cleanup: cancelar requisição e limpar referência
    return () => {
      controller.abort();
      latestRequest.current = null; // Resetar para permitir novas requisições
    };
  }, [endpoint, options.method, options.headers, options.body, options.enabled]);

  return { data, loading, error };
};

export default useApi;