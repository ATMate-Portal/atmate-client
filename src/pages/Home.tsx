import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Home.css";
import ClientAccordionItem from "../components/ClientAccordionItem";
import useApi from "../hooks/useApi";

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
  const { data: clients, loading, error } = useApi<ClientTax[]>("atmate-gateway/tax/getUrgentTaxes?days=250");

  if (loading) return <p>A carregar...</p>;
  if (error) return <p>Erro ao obter dados.</p>;

  return (
    <div className="container">
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
