import React, { useState, useEffect, useCallback } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Home.css";
import ClientAccordionItem from "../components/ClientAccordionItem";
import useApi from "../hooks/useApi";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSyncAlt } from "@fortawesome/free-solid-svg-icons";

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

const Home: React.FC = () => {
  const [retry, setRetry] = useState(false);
  const [days, setDays] = useState(100);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0); // Novo estado para forçar o refresh
  const apiUrl = `atmate-gateway/tax/getUrgentTaxes?days=${days}&refresh=${refreshCounter}`;
  const { data: clients, loading, error } = useApi<ClientTax[]>(apiUrl);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshCounter((prev) => prev + 1); // Incrementa o contador para mudar a apiUrl
  }, [setRefreshing, setRefreshCounter]);

  useEffect(() => {
    if ((clients?.length ?? 0) > 0 && !loading && !error) {
      const now = new Date();
      setLastUpdated(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
      setRetry(false);
    } else if (clients?.length === 0 && !loading && !error && !retry) {
      setDays((prevDays) => prevDays + 50);
      setRetry(true);
    }
    setRefreshing(false); // Indica que o refresh terminou
  }, [clients, loading, error, retry, setDays]);

  if (loading) return <p>A carregar...</p>;
  if (error) return <p>Erro ao obter dados.</p>;

  return (
    <div className="container animate-fade-in">
      <div className="d-flex align-items-center">
        <div>
          {lastUpdated && (
            <p className="text-muted">
              <FontAwesomeIcon
                icon={faSyncAlt}
                className="mr-2"
                style={{ cursor: "pointer" }}
                onClick={handleRefresh}
                spin={refreshing}
              />
              &nbsp;
              Última atualização: {lastUpdated}
            </p>
          )}
          {!lastUpdated && <p className="text-muted">Aguardando dados...</p>}
        </div>
      </div>
      <div className="accordion-container">
        <div className="accordion w-100 mx-auto" id="mainAccordion">
          {clients?.map((client, index) => (
            <ClientAccordionItem key={client.clientId} client={client} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;