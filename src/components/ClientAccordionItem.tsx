import React from 'react';
import TaxTable from './TaxTable';

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

interface Props {
  client: ClientTax;
  index: number;
  warningDays: number;
  urgentDays: number;
}

const ClientAccordionItem: React.FC<Props> = ({ client, index, warningDays, urgentDays }) => {
  const { clientId, clientName, taxes } = client;

  // Determinar o estado com base nos dias restantes
  const daysLeft = taxes[0]?.daysLeft;
  let status: 'urgent' | 'warning' | 'normal' = 'normal';
  let icon = '🟢'; // Ícone para estado normal

  if (daysLeft !== undefined) {
    if (daysLeft <= urgentDays) {
      status = 'urgent';
      icon = '🚨'; // Ícone para urgente
    } else if (daysLeft <= warningDays) {
      status = 'warning';
      icon = '⚠️'; // Ícone para aviso
    }
  }

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
              <span className="fs-4">{icon}</span>
              <span className="ms-4 fs-3">{clientName}</span>
            </div>
            <span className="text-muted me-5">
              {daysLeft !== undefined ? `${daysLeft} dias até expirar` : 'Sem prazo'}
            </span>
          </div>
        </button>
      </h2>
      <div
        id={`collapse${index}`}
        className={`accordion-collapse collapse ${index === 0 ? 'show' : ''}`}
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