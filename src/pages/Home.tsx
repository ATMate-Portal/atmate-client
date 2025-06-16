import React, { useState, useEffect, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Home.css';
import ClientAccordionItem from '../components/ClientAccordionItem';
import useApi from '../hooks/useApi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons';


// --- INTERFACES DE DADOS ---

/**
 * @interface Tax
 * Define a estrutura de dados para um imposto individual.
 */
interface Tax {
  taxId: number;
  taxData: string;  // JSON string com detalhes extra.
  type: number;
  licensePlate: string;
  amount: string;
  paymentDeadline: string;
  daysLeft: number;
}

/**
 * @interface ClientTax
 * Define a estrutura de dados para um cliente, que contém uma lista dos seus impostos urgentes.
 */
interface ClientTax {
  clientId: number;
  clientName: string;
  nextPaymentDate: string;
  taxes: Tax[];
}

/**
 * @interface ParamsDTO
 * Define a estrutura dos parâmetros de configuração obtidos da API.
 */
interface ParamsDTO {
  warningDays: string;
  urgencyDays: string;
}

/**
 * @component Home
 * A página principal da aplicação. Exibe uma lista de clientes com impostos urgentes
 * num formato de accordion. A lógica desta página é dividida em duas fases:
 * 1. Primeiro, vai buscar os parâmetros de configuração (dias de aviso/urgência).
 * 2. Depois, usa esses parâmetros para ir buscar a lista de clientes com impostos a expirar.
 */
const Home: React.FC = () => {
  // --- ESTADOS DO COMPONENTE ---
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [refreshCounter, setRefreshCounter] = useState(0);
  // Estado para guardar a URL da API de clientes, que só é construída após obter os parâmetros.
  const [clientApiUrl, setClientApiUrl] = useState<string | null>(null);

  // --- CHAMADAS À API ---

    // 1. Primeira chamada: Buscar os parâmetros de configuração.
  const { data: params, loading: paramsLoading, error: paramsError } = useApi<ParamsDTO>(
    'atmate-gateway/config/getParams'
  );

  // Definir warningDays e urgentDays apenas quando params estiver disponível
  const warningDays = params?.warningDays ? parseInt(params.warningDays) : null;
  const urgentDays = params?.urgencyDays ? parseInt(params.urgencyDays) : null;

  // Atualizar clientApiUrl quando params estiver carregado
  useEffect(() => {
    if (paramsLoading || !params || warningDays === null) {
      setClientApiUrl(null); // Evitar definir URL até params estar carregado
      return;
    }
    setClientApiUrl(`atmate-gateway/tax/getUrgentTaxes?days=${warningDays}&refresh=${refreshCounter}`);
  }, [paramsLoading, params, warningDays, refreshCounter]);

  // 2. Segunda chamada: Obter os dados dos clientes.
  const {
    data: clients,
    loading: clientsLoading,
    error: clientsError,
  } = useApi<ClientTax[]>(clientApiUrl || '', {
    enabled: !!clientApiUrl,
  });

  /**
     * @function handleRefresh
     * Função chamada pelo botão de atualizar.
     */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshCounter((prev) => prev + 1);
  }, []);

  // Atualizar a data da "Última atualização" quando os dados dos clientes chegam.
  useEffect(() => {
    if (clients && clients.length > 0 && !clientsLoading && !clientsError) {
      const now = new Date();
      setLastUpdated(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
    }
    setRefreshing(false);
  }, [clients, clientsLoading, clientsError]);

  // --- RENDERIZAÇÃO CONDICIONAL ---

  // Exibe mensagens de carregamento ou erro durante as chamadas à API.
  if (paramsLoading || clientsLoading) return <p>A carregar...</p>;
  if (paramsError) return <p>Erro ao carregar configurações: {paramsError}</p>;
  if (clientsError) return <p>Erro ao carregar clientes: {clientsError}</p>;

  // --- RENDERIZAÇÃO PRINCIPAL ---
  return (
  <div className="home-wrapper animate-fade-in">
    {/* Barra superior com o botão de atualização e a data. */}
    <div className="top-bar">
      {lastUpdated ? (
        <p className="text-muted">
          <FontAwesomeIcon
            icon={faSyncAlt}
            className="me-2"
            style={{ cursor: "pointer" }}
            spin={refreshing}
            onClick={handleRefresh}
          />
          Última atualização: {lastUpdated}
        </p>
      ) : (
        <p className="text-muted">Aguardando dados...</p>
      )}
    </div>

    {/* Accordion. */}
    <div className="accordion-container">
      <div className="accordion" id="mainAccordion">
        {clients?.map((client, index) => (
          <ClientAccordionItem
            key={client.clientId}
            client={client}
            index={index}
            warningDays={warningDays ?? 7}
            urgentDays={urgentDays ?? 2}
          />
        ))}
      </div>
    </div>
  </div>
);

};

export default Home;