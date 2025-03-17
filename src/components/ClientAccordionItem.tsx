import React from "react";
import TaxTable from "./TaxTable";

interface Tax {
  taxId: number;
  type: number;
  amount: string;
  paymentDeadline: string;
  daysLeft: number;
}

interface ClientTax {
  clientId: number;
  clientName: string;
  taxes: Tax[];
}

interface Props {
  client: ClientTax;
  index: number;
}

const ClientAccordionItem: React.FC<Props> = ({ client, index }) => {
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
            <span className="text-muted me-5">{taxes[0]?.daysLeft} dias até expirar</span>
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

export default ClientAccordionItem;
