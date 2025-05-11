import React from 'react';
import UrgentTaxTable from './UrgentTaxTable'; // Assuming this component exists
import { useNavigate } from 'react-router-dom'; // Import useNavigate

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
  const navigate = useNavigate(); // Initialize navigate

  // Determine the state based on the remaining days
  const daysLeft = taxes[0]?.daysLeft;
  let status: 'urgent' | 'warning' | 'normal' = 'normal';
  let icon = '🟢'; // Icon for normal state

  if (daysLeft !== undefined) {
    if (daysLeft <= urgentDays) {
      status = 'urgent';
      icon = '🚨'; // Icon for urgent
    } else if (daysLeft <= warningDays) {
      status = 'warning';
      icon = '⚠️'; // Icon for warning
    }
  }

  // Function to handle click on client name
  const handleClientNameClick = () => {
    navigate(`/clients/${clientId}`);
  };

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
              {/* Apply hover effect and click handler to clientName */}
              <span
                className="ms-4 fs-3 hover:underline cursor-pointer" // Added Tailwind classes for underline on hover and cursor
                onClick={handleClientNameClick} // Added onClick handler
                style={{ textDecoration: 'none' }} // Ensure no default underline
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                {clientName}
              </span>
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
        data-bs-parent="#mainAccordion" // Assuming your main accordion has this ID
      >
        <div className="accordion-body">
          {/* Ensure UrgentTaxTable component is correctly imported and used */}
          {taxes && taxes.length > 0 ? (
            <UrgentTaxTable taxes={taxes} />
          ) : (
            <p>Não existem impostos para este cliente.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientAccordionItem;
