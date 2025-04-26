import React, { useState, useEffect, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Home.css';
import ClientAccordionItem from '../components/ClientAccordionItem';
import useApi from '../hooks/useApi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons';

interface Tax {
  taxId: number;
  taxData: string;
  type: number;
  licensePlate: string;
  amount: string;
  paymentDeadline: string;
  daysLeft: number;
}

interface ClientTax {
  clientId: number;
  clientName: string;
  nextPaymentDate: string;
  taxes: Tax[];
}

interface ParamsDTO {
  warningDays: string;
  urgencyDays: string;
}

const Home: React.FC = () => {
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [clientApiUrl, setClientApiUrl] = useState<string | null>(null);

  // Buscar parâmetros da API
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

  // Buscar clientes apenas se clientApiUrl estiver definido
  const {
    data: clients,
    loading: clientsLoading,
    error: clientsError,
  } = useApi<ClientTax[]>(clientApiUrl || '', {
    enabled: !!clientApiUrl, // Só faz fetch quando for string válida
  });

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshCounter((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (clients && clients.length > 0 && !clientsLoading && !clientsError) {
      const now = new Date();
      setLastUpdated(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
    }
    setRefreshing(false);
  }, [clients, clientsLoading, clientsError]);

  if (paramsLoading || clientsLoading) return <p>A carregar...</p>;
  if (paramsError) return <p>Erro ao carregar configurações: {paramsError}</p>;
  if (clientsError) return <p>Erro ao carregar clientes: {clientsError}</p>;

  return (
    <div className="container animate-fade-in">
      <div className="d-flex align-items-center">
        <div>
          {lastUpdated && (
            <p className="text-muted">
              <FontAwesomeIcon
                icon={faSyncAlt}
                className="mr-2 me-2"
                style={{ cursor: 'pointer' }}
                spin={refreshing}
                onClick={handleRefresh} // Mover onClick para o ícone
              />
              Última atualização: {lastUpdated}
            </p>
          )}
          {!lastUpdated && <p className="text-muted">Aguardando dados...</p>}
        </div>
      </div>
      <div className="accordion-container">
        <div className="accordion w-100 mx-auto" id="mainAccordion">
          {clients?.map((client, index) => (
            <ClientAccordionItem
              key={client.clientId}
              client={client}
              index={index}
              warningDays={warningDays ?? 7} // Valor padrão apenas para renderização
              urgentDays={urgentDays ?? 2}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;