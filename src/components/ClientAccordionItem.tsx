import React from 'react';
// Importa o componente que irá renderizar a tabela de impostos dentro do accordion.
import UrgentTaxTable from './UrgentTaxTable'; 
// Importa o hook 'useNavigate' do React Router para permitir a navegação programática.
import { useNavigate } from 'react-router-dom'; 

// --- INTERFACES DE DADOS ---

/**
 * @interface Tax
 * Define a estrutura de dados para um único imposto.
 */
interface Tax {
  taxId: number;
  taxData: string;
  type: number;
  licensePlate: string;
  amount: string;
  paymentDeadline: string;
  daysLeft: number; // Número de dias restantes até ao prazo de pagamento.
}

/**
 * @interface ClientTax
 * Define a estrutura de dados para um cliente, que inclui uma lista dos seus impostos.
 */
interface ClientTax {
  clientId: number;
  clientName: string;
  nextPaymentDate: string;
  taxes: Tax[];
}

/**
 * @interface Props
 * Define as propriedades que o componente ClientAccordionItem espera receber.
 */
interface Props {
  client: ClientTax;      // O objeto do cliente com os seus dados e impostos.
  index: number;          // O índice do item no accordion, usado para gerar IDs únicos.
  warningDays: number;    // O número de dias que define o estado de "aviso".
  urgentDays: number;     // O número de dias que define o estado de "urgente".
}

/**
 * @component ClientAccordionItem
 * Este componente renderiza um item de um accordion (estilo Bootstrap) para um cliente específico.
 * Mostra o nome do cliente, um ícone de estado baseado na urgência do imposto mais próximo,
 * e uma tabela com os detalhes dos impostos quando expandido.
 */
const ClientAccordionItem: React.FC<Props> = ({ client, index, warningDays, urgentDays }) => {
  // Desestrutura os dados do cliente para facilitar o acesso.
  const { clientId, clientName, taxes } = client;
  // Inicializa a função de navegação do React Router.
  const navigate = useNavigate();

  // --- LÓGICA DE ESTADO ---
  // Determina o estado de urgência com base nos dias restantes do primeiro imposto da lista (o mais próximo).
  const daysLeft = taxes[0]?.daysLeft;
  let status: 'urgent' | 'warning' | 'normal' = 'normal';
  let icon = '🟢'; // Ícone para o estado normal.

  if (daysLeft !== undefined) {
    if (daysLeft <= urgentDays) {
      status = 'urgent';
      icon = '🚨'; // Ícone para o estado urgente.
    } else if (daysLeft <= warningDays) {
      status = 'warning';
      icon = '⚠️'; // Ícone para o estado de aviso.
    }
  }

  /**
   * @function handleClientNameClick
   * Função chamada quando o nome do cliente é clicado.
   * Navega para a página de perfil detalhada desse cliente.
   */
  const handleClientNameClick = () => {
    navigate(`/clients/${clientId}`);
  };

  return (
    // Cada item do accordion tem uma chave única baseada no ID do cliente.
    <div className="accordion-item" key={clientId}>
      <h2 className="accordion-header" id={`heading${index}`}>
        <button
          className="accordion-button fs-4 d-flex justify-content-between align-items-center"
          type="button"
          data-bs-toggle="collapse" // Atributo do Bootstrap para controlar o accordion.
          data-bs-target={`#collapse${index}`}
          aria-expanded={index === 0} // O primeiro item do accordion começa expandido.
          aria-controls={`collapse${index}`}
        >
          <div className="d-flex align-items-center w-100 justify-content-between">
            <div className="d-flex align-items-center">
              {/* Ícone de estado que muda de acordo com a urgência. */}
              <span className="fs-4">{icon}</span>
              
              {/* O nome do cliente é clicável para navegar para o seu perfil. */}
              <span
                className="ms-4 fs-3 hover:underline cursor-pointer"
                onClick={handleClientNameClick}
                // Efeitos de hover para melhorar a experiência do utilizador.
                style={{ textDecoration: 'none' }} 
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                {clientName}
              </span>
            </div>
            {/* Mostra os dias restantes até ao prazo do imposto mais próximo. */}
            <span className="text-muted me-5">
              {daysLeft !== undefined ? `${daysLeft} dias até expirar` : 'Sem prazo'}
            </span>
          </div>
        </button>
      </h2>
      <div
        id={`collapse${index}`}
        // O primeiro item começa visível ('show').
        className={`accordion-collapse collapse ${index === 0 ? 'show' : ''}`}
        aria-labelledby={`heading${index}`}
        data-bs-parent="#mainAccordion" // Garante que apenas um item do accordion fica aberto de cada vez.
      >
        <div className="accordion-body">
          {/* Renderiza a tabela de impostos se existirem, caso contrário, mostra uma mensagem. */}
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
