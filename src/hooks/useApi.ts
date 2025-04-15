import { useState, useEffect } from "react";
import axios, { AxiosRequestConfig } from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ApiCallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
}

const useApi = <T,>(endpoint: string, options: ApiCallOptions = {}) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { method = 'GET', headers, body } = options;
      const config: AxiosRequestConfig = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers,
        data: body,
      };

      try {
        const response = await axios<T>(config);
        setData(response.data);
      } catch (err: any) {
        setError(err.message || "Erro ao buscar dados da API");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint, JSON.stringify(options)]); // Dependência em options para refazer a chamada se as opções mudarem

  return { data, loading, error };
};

export default useApi;