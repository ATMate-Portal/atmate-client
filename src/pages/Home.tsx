import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Home.css";

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
  const [clients, setClients] = useState<ClientTax[]>([]);

  useEffect(() => {
    const fetchClientTaxes = async () => {
      try {
        const response = await fetch(
          "http://atmate.sytes.net:8180/atmate-gateway/tax/getUrgentTaxes?days=250"
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const clientData: ClientTax[] = await response.json();
        setClients(clientData);
      } catch (error) {
        console.error("Error fetching client taxes:", error);
      }
    };

    fetchClientTaxes();
  }, []);

  return (
    <div className="container">
      <div className="accordion-container">
        <div className="accordion w-100 mx-auto" id="mainAccordion">
          {clients.map((client, index) => (
            <ClientAccordionItem key={client.clientId} client={client} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
};

interface ClientAccordionItemProps {
  client: ClientTax;
  index: number;
}

const ClientAccordionItem: React.FC<ClientAccordionItemProps> = ({ client, index }) => {
    const { clientId, clientName, taxes } = client;
    const isUrgent = taxes[0]?.daysLeft <= 100;

    return (
      <div className="accordion-item" key={clientId}>
        <h2 className="accordion-header" id={`heading${index}`}>
          <button
            className="accordion-button fs-4 d-flex justify-content-between align-items-center"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target={`#collapse${index}`}
            aria-expanded={index === 0}
            aria-controls={`collapse${index}`}
          >
            <div className="d-flex align-items-center w-100 justify-content-between">
              <div className="d-flex align-items-center">
                <span className="fs-4">{isUrgent ? "🚨" : "⚠️"}</span>
                <span className="ms-4 fs-3">{clientName}</span>
              </div>
              <span className="text-muted me-5">
                {taxes[0]?.daysLeft} dias até expirar
              </span>
            </div>
          </button>
        </h2>
        <div
          id={`collapse${index}`}
          className={`accordion-collapse collapse ${index === 0 ? "show" : ""}`}
          aria-labelledby={`heading${index}`}
          data-bs-parent="#mainAccordion"
        >
          <div className="accordion-body">
            <TaxTable taxes={taxes} />
          </div>
        </div>
      </div>
    );
  };

interface TaxTableProps {
  taxes: Tax[];
}

const TaxTable: React.FC<TaxTableProps> = ({ taxes }) => {
  return (
    <div className="table-responsive">
      <table className="table custom-table">
        <tbody>
          <tr className="table custom-header">
            <td>Imposto</td>
            <td>Montante</td>
            <td>Data limite</td>
            <td></td>
          </tr>
          {taxes.map((tax) => {
            const parsedTaxData = JSON.parse(tax.taxData);
            return (
              <tr key={tax.taxId}>
                <td>{tax.type}</td>
                <td>{tax.amount}</td>
                <td>{tax.paymentDeadline}</td>
                <td>
                  <i className="fas fa-clock"></i>
                  &nbsp;&nbsp;
                  <span className="text-muted font-weight-semibold">
                    {tax.daysLeft} dias até expirar
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Home;