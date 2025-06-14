import React, { useState } from "react"; // Removed useEffect, useCallback as they are not used
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faInfoCircle, 
    faCalendarAlt, 
    faEuroSign, 
    faHashtag, 
    faFileInvoice,
    faTag, 
    faUser, 
    faCalendar, 
    faCheckCircle, 
    faFileAlt, 
    faChevronDown, 
    faChevronUp,
    faSpinner // For loading state
} from '@fortawesome/free-solid-svg-icons';

// --- INTERFACES DE DADOS ---

/**
 * @interface Tax
 * Define a estrutura de dados básica para um imposto, tal como é recebido nas props.
 * Esta estrutura é mais simples e é usada para popular a tabela inicial.
 */
interface Tax {
    taxId: number;
    taxData: string; // O JSON string que contém a informação detalhada do imposto.
    type: number;    // Tipo numérico do imposto (usado para uma exibição inicial, se necessário).
    licensePlate: string; // Matrícula, para acesso rápido.
    amount: string;
    paymentDeadline: string;
    daysLeft: number;
}

/**
 * @interface DetailedTaxModalData
 * Define a estrutura de dados mais completa que é usada para popular o modal de detalhes.
 * É construída a partir do processamento do JSON contido em `taxData`.
 */
interface DetailedTaxModalData {
    identificadorUnico: string;
    tipo: string; // Tipo em formato de texto (ex: "IUC", "IMI").
    dataLimite: string;
    clientName?: string; // O nome do cliente pode não estar sempre presente no JSON.
    valor: string;
    estado?: string;
    json: string;     // Guarda o JSON original para ser processado internamente pelo modal.
    taxId: number;
}

/**
 * @interface Props
 * Define as propriedades que o componente UrgentTaxTable espera receber.
 */
interface Props {
    taxes: Tax[]; // Uma lista de impostos a serem exibidos na tabela.
}

// --- FUNÇÕES HELPER (AUXILIARES) ---
// Estas funções são idealmente partilhadas num ficheiro de utilitários (utils).

/**
 * @function formatFieldName
 * Formata os nomes das chaves do JSON para uma apresentação legível na UI do modal.
 */
const formatFieldName = (key: string): string => {
    if (key === 'categoriaIUC') return 'Categoria IUC';
    if (key === 'dataMatricula') return 'Data de Matrícula';
    if (key === 'data1Matricula') return 'Data da Primeira Matrícula';

    let formatted = key
        .replace(/^desc/i, '')
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .trim();

    formatted = formatted
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

    formatted = formatted
        .replace('Ambito Utilizacao', 'Âmbito de Utilização')
        .replace('Tipo Susp Frente', 'Tipo Suspensão Frente')
        .replace('Tipo Susp Retaguarda', 'Tipo Suspensão Retaguarda')
        .replace('Veiculo', 'Veículo')
        .replace('Passageiros', 'de Passageiros')
        .replace('Pesado', 'Pesado')
        .replace('Matree', 'Matrícula EEE')
        .replace('Paisee', 'País EEE')
        .replace('Cod Pais Eee', 'Código País EEE')
        .replace('Data Pais Eee', 'Data País EEE')
        .replace('Quant Eixos', 'Quantidade de Eixos')
        .replace('Quant Eixos Frente', 'Quantidade de Eixos Frente')
        .replace('Quant Eixos Retaguarda', 'Quantidade de Eixos Retaguarda')
        .replace('Peso Conjunto', 'Peso do Conjunto')
        .replace('Peso Maximo Conjunto', 'Peso Máximo do Conjunto')
        .replace('Transporte Go', 'Transporte GO')
        .replace('Ind Transformacao', 'Indicação de Transformação');
    return formatted;
};

/**
 * @function formatValue
 * Formata os valores do JSON, convertendo booleanos para 'Sim'/'Não'.
 */
const formatValue = (value: any): string => {
    const trimmedValue = String(value).trim();
    if (trimmedValue.toLowerCase() === 'true') return 'Sim';
    if (trimmedValue.toLowerCase() === 'false') return 'Não';
    return trimmedValue;
};

// Lista de campos a serem excluídos da exibição genérica de detalhes no modal.
const fieldsToExclude = [
    'Nif', 'Nif Loc', 'Matricula', 'data1Matricula',
    // Exclui campos que já são tratados de forma explícita ou são parte de sub-objetos.
    'type', 'Valor Base', 'Data Limite de Pagamento', 'Situação da Nota', 'clientName'
];

/**
 * @component UrgentTaxTable
 * Renderiza uma tabela simplificada com impostos urgentes para um cliente específico.
 * Inclui um modal para exibir informações detalhadas de cada imposto.
 */
const UrgentTaxTable: React.FC<Props> = ({ taxes }) => {
 // --- ESTADOS DO COMPONENTE ---
    // Estado para guardar os dados processados do imposto selecionado para o modal.
    const [selectedTaxForModal, setSelectedTaxForModal] = useState<DetailedTaxModalData | null>(null);
    // Controla a visibilidade do modal.
    const [showTaxDetailModal, setShowTaxDetailModal] = useState(false);
    // Controla o estado de carregamento dentro do modal (para feedback ao utilizador).
    const [loadingModalDetails, setLoadingModalDetails] = useState(false);
    // Armazena mensagens de erro que possam ocorrer ao processar os dados para o modal.
    const [modalError, setModalError] = useState<string | null>(null);
    // Controla a visibilidade da secção de detalhes do veículo dentro do modal (para IUC).
    const [showVehicleDetails, setShowVehicleDetails] = useState(false);

    /**
     * @function processTaxDataForModal
     * Processa o JSON string de um imposto (`tax.taxData`) e transforma-o numa estrutura
     * de dados mais rica e consistente (`DetailedTaxModalData`) para ser usada pelo modal.
     * @param tax - O objeto de imposto da lista de props.
     * @returns Um objeto `DetailedTaxModalData` pronto para o modal.
     */
  const processTaxDataForModal = (tax: Tax): DetailedTaxModalData => {
    const parsedJson = JSON.parse(tax.taxData);

    // Constrói o objeto de dados detalhados, usando fallbacks para garantir que os campos essenciais são preenchidos.
    return {
            taxId: tax.taxId,
            identificadorUnico: parsedJson.Matrícula || parsedJson["Nº Nota Cob."] || parsedJson.identificadorUnico || tax.licensePlate || `REF-${tax.taxId}`,
            tipo: parsedJson.type || getTaxTypeDescriptionFromNumeric(tax.type),
            dataLimite: parsedJson["Data Limite de Pagamento"] || tax.paymentDeadline,
            clientName: parsedJson.clientName,
            valor: parsedJson["Valor Base"] || parsedJson.amount || tax.amount,
            estado: parsedJson["Situação da Nota"] || "Desconhecido",
            json: tax.taxData, // Passa o JSON original para o modal poder fazer o seu próprio parse de sub-objetos.
        };
  };

  /**
     * @function handleOpenTaxDetailsModal
     * Chamada quando o botão "Ver Detalhes" é clicado. Prepara e abre o modal.
     */
  const handleOpenTaxDetailsModal = (tax: Tax) => {
    setLoadingModalDetails(true);
    setShowTaxDetailModal(true);
    // Reseta os estados anteriores para uma exibição limpa.
    setSelectedTaxForModal(null);
    setShowVehicleDetails(false);
    setModalError(null);

    try {
      // Processa os dados do imposto para o formato do modal.
      const detailedData = processTaxDataForModal(tax);
      setSelectedTaxForModal(detailedData);
    } catch (error: any) {
      console.error("Erro ao processar dados do imposto para o modal:", error);
      setModalError("Erro ao processar os dados do imposto para o modal. Verifique o formato do JSON em taxData.");
    } finally {
      setLoadingModalDetails(false);
    }
  };

  /**
     * @function handleCloseTaxDetailsModal
     * Fecha o modal e limpa todos os estados relacionados.
     */
  const handleCloseTaxDetailsModal = () => {
    setShowTaxDetailModal(false);
    setSelectedTaxForModal(null);
    setModalError(null);
    setLoadingModalDetails(false);
    setShowVehicleDetails(false);
  };

  // Alterna a visibilidade dos detalhes do veículo (para IUC) no modal.
  const toggleVehicleDetails = () => {
    setShowVehicleDetails(prev => !prev);
  };

  /**
     * @function getTaxTypeDescriptionFromNumeric
     * Converte o tipo numérico do imposto (da prop) para uma descrição em texto para a tabela.
     * Serve como fallback caso o JSON não tenha um campo 'type' em texto.
     */
  const getTaxTypeDescriptionFromNumeric = (typeNumber: number): string => {
    switch (typeNumber) {
        case 1: return "IVA"; 
        case 2: return "IRS"; 
        case 3: return "IUC"; 
        default: return `${typeNumber}`;
    }
  };

  // --- RENDERIZAÇÃO DO COMPONENTE ---
  return (
    <>
      {/* Tabela de Impostos Urgentes */}
      <div className="table-responsive">
        <table className="table custom-table"> {/* Ensure 'custom-table' styles are defined */}
          <thead>
            <tr className="table custom-header"> {/* Ensure 'custom-header' styles are defined */}
              <th>Imposto</th>
              <th>Montante</th>
              <th>Data limite</th>
              <th>Dias Restantes</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {taxes && taxes.length > 0 ? (
              // Mapeia a lista de impostos para renderizar cada linha da tabela.
              taxes.map((tax) => (
                <tr key={tax.taxId}>
                  {/* Exibe o tipo do imposto, tratando tanto number como string. */}
                  <td>{typeof tax.type === 'number' ? getTaxTypeDescriptionFromNumeric(tax.type) : tax.type}</td>
                  <td>{tax.amount}</td>
                  <td>{tax.paymentDeadline}</td>
                  <td>
                    <span className="text-muted font-weight-semibold">
                      {tax.daysLeft} dias até expirar
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-secondary rounded-pill shadow-sm"
                      onClick={() => handleOpenTaxDetailsModal(tax)}
                    >
                      <FontAwesomeIcon icon={faInfoCircle} className="me-1" /> Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              // Mensagem exibida se não houver impostos.
              <tr>
                <td colSpan={5} className="text-center text-muted py-3">
                  Não existem impostos urgentes para este cliente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalhes do Imposto (renderizado condicionalmente) */}
      {showTaxDetailModal && (
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          aria-labelledby="taxDetailsModalLabel" 
          aria-hidden={!showTaxDetailModal}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={handleCloseTaxDetailsModal} 
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}> 
            <div className="modal-content" id="taxes-modal-content">
              <div className="modal-header" id="taxes-modal-header">
                <h5 className="modal-title" id="taxDetailsModalLabel">
                  <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                  {loadingModalDetails ? "A Carregar Detalhes..." : 
                    selectedTaxForModal ? `${selectedTaxForModal.tipo} - ${selectedTaxForModal.identificadorUnico}` : "Detalhes do Imposto"
                  }
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={handleCloseTaxDetailsModal} 
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body" id="taxes-modal-body">
                {/* Exibe um spinner, uma mensagem de erro, ou os detalhes do imposto. */}
                {loadingModalDetails ? (
                  <div className="text-center py-5">
                    <FontAwesomeIcon icon={faSpinner} spin size="3x" />
                    <p className="mt-2">A carregar...</p>
                  </div>
                ) : modalError ? (
                  <div className="alert alert-danger">{modalError}</div>
                ) : selectedTaxForModal ? (
                  <div id="taxes-details-container">
                    <div id="taxes-details-card">
                      <h6 className="card-title" id="taxes-card-title">
                        <FontAwesomeIcon icon={faTag} className="me-2" />
                        Detalhes da Obrigação Fiscal
                      </h6>
                      <div id="taxes-details-list">
                        {/* Detalhes principais exibidos explicitamente. */}
                        <div className="detail-row" id="taxes-detail-row-tipo">
                          <FontAwesomeIcon icon={faTag} className="detail-icon" />
                          <span className="detail-label">Tipo:</span>
                          <span className="detail-value">{selectedTaxForModal.tipo}</span>
                        </div>
                        {/* Secção para detalhes do veículo, clicável e expansível se for IUC. */}
                        <div 
                          className="detail-row d-flex align-items-center" 
                          id="taxes-detail-row-referencia"
                          style={{ cursor: selectedTaxForModal.tipo === 'IUC' ? 'pointer' : 'default' }}
                          onClick={selectedTaxForModal.tipo === 'IUC' ? toggleVehicleDetails : undefined}
                        >
                          <FontAwesomeIcon icon={faFileAlt} className="detail-icon me-2" />
                          <span className="detail-label">
                            {selectedTaxForModal.tipo === 'IMI' ? 'Nota Cobrança:' : selectedTaxForModal.tipo === 'IUC' ? 'Matrícula:' : 'Referência:'}
                          </span>
                          <span className="detail-value flex-grow-1">{selectedTaxForModal.identificadorUnico}</span>
                          {selectedTaxForModal.tipo === 'IUC' && (
                            <FontAwesomeIcon 
                              icon={showVehicleDetails ? faChevronUp : faChevronDown} 
                              className="ms-2 text-muted"
                            />
                          )}
                        </div>
                        {/* Renderização condicional dos detalhes do veículo. */}
                        {selectedTaxForModal.tipo === 'IUC' && showVehicleDetails && (
                          <div className="detail-row ms-4 mt-2" id="taxes-detail-row-vehicle-details">
                            <div className="card p-3 bg-light">
                              <h6 className="mb-3">Detalhes do Veículo</h6>
                              {(() => {
                                try {
                                  const jsonDataFromModalState = JSON.parse(selectedTaxForModal.json); // Use .json from state
                                  const vehicleDetails = jsonDataFromModalState.detalhes_veiculo || {};
                                  const validEntries = Object.entries(vehicleDetails).filter(
                                    ([key, value]) => 
                                      !fieldsToExclude.includes(key) &&
                                      !fieldsToExclude.includes(formatFieldName(key)) &&
                                      value != null && 
                                      String(value).trim() !== '' && 
                                      String(value).toLowerCase() !== 'null' && 
                                      String(value) !== '-'
                                  );
                                  if (validEntries.length === 0) {
                                    return (
                                      <div className="detail-row text-muted" id="taxes-detail-row-vehicle-empty">
                                        <FontAwesomeIcon icon={faFileAlt} className="detail-icon me-2" />
                                        <span className="detail-value">Nenhum detalhe de veículo disponível.</span>
                                      </div>
                                    );
                                  }
                                  return validEntries.map(([key, value]) => {
                                    const safeKey = key.toLowerCase().replace(/[^a-z0-9]/g, '-');
                                    const formattedKey = formatFieldName(key);
                                    const formattedValue = formatValue(value);
                                    return (
                                      <div className="detail-row mb-2" key={`vehicle-${safeKey}`} id={`taxes-detail-row-vehicle-${safeKey}`}>
                                        <FontAwesomeIcon icon={faFileAlt} className="detail-icon me-2 text-secondary" />
                                        <span className="detail-label">{formattedKey}:</span>
                                        <span className="detail-value">{formattedValue}</span>
                                      </div>
                                    );
                                  });
                                } catch (e) {
                                  return (
                                    <div className="detail-row text-danger" id="taxes-detail-row-vehicle-error">
                                      <FontAwesomeIcon icon={faFileAlt} className="detail-icon me-2" />
                                      <span className="detail-value">Não foi possível carregar os detalhes do veículo (JSON inválido).</span>
                                    </div>
                                  );
                                }
                              })()}
                            </div>
                          </div>
                        )}
                        {selectedTaxForModal.clientName && ( 
                            <div className="detail-row" id="taxes-detail-row-cliente">
                                <FontAwesomeIcon icon={faUser} className="detail-icon" />
                                <span className="detail-label">Cliente:</span>
                                <span className="detail-value">{selectedTaxForModal.clientName}</span>
                            </div>
                        )}
                        <div className="detail-row" id="taxes-detail-row-data">
                          <FontAwesomeIcon icon={faCalendar} className="detail-icon" />
                          <span className="detail-label">Data Limite:</span>
                          <span className="detail-value">{selectedTaxForModal.dataLimite}</span>
                        </div>
                        <div className="detail-row" id="taxes-detail-row-valor">
                          <FontAwesomeIcon icon={faEuroSign} className="detail-icon" />
                          <span className="detail-label">Valor:</span>
                          <span className="detail-value">{selectedTaxForModal.valor}</span>
                        </div>
                        {selectedTaxForModal.estado && (
                            <div className="detail-row" id="taxes-detail-row-estado">
                                <FontAwesomeIcon icon={faCheckCircle} className="detail-icon" />
                                <span className="detail-label">Estado:</span>
                                <span className={`badge modern-badge ${'badge-pending'}`}>
                                    Pendente
                                </span>
                            </div>
                        )}
                        {/* Renderização dos restantes detalhes gerais do JSON. */}
                        {(() => {
                          try {
                            const jsonDataFromModalState = JSON.parse(selectedTaxForModal.json);
                            const generalEntries = Object.entries(jsonDataFromModalState).filter(
                              ([key, value]) => 
                                key !== 'detalhes_veiculo' &&
                                !fieldsToExclude.includes(key) &&
                                !fieldsToExclude.includes(formatFieldName(key)) &&
                                value != null &&
                                String(value).trim() !== '' &&
                                String(value).toLowerCase() !== 'null' &&
                                String(value) !== '-'
                            );
                            if (generalEntries.length === 0 && (!jsonDataFromModalState.detalhes_veiculo || Object.keys(jsonDataFromModalState.detalhes_veiculo).length === 0)) {
                                return (
                                    selectedTaxForModal.tipo !== 'IUC' && 
                                    <div className="detail-row text-muted mt-3" id="taxes-detail-row-additional-empty">
                                        <FontAwesomeIcon icon={faInfoCircle} className="detail-icon me-2" />
                                        <span className="detail-value">Sem detalhes adicionais.</span>
                                    </div>
                                );
                            }
                            return generalEntries.map(([key, value]) => {
                              const safeKey = key.toLowerCase().replace(/[^a-z0-9]/g, '-');
                              const formattedKey = formatFieldName(key);
                              const formattedValue = formatValue(value);
                              return (
                                <div className="detail-row" key={`general-${safeKey}`} id={`taxes-detail-row-${safeKey}`}>
                                  <FontAwesomeIcon icon={faFileAlt} className="detail-icon text-secondary" />
                                  <span className="detail-label">{formattedKey}:</span>
                                  <span className="detail-value">{formattedValue}</span>
                                </div>
                              );
                            });
                          } catch (e) {
                            return (
                              <div className="detail-row text-danger mt-3" id="taxes-detail-row-json-error">
                                <FontAwesomeIcon icon={faInfoCircle} className="detail-icon me-2" />
                                <span className="detail-value">Erro ao processar dados adicionais (JSON inválido).</span>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  !modalError && <div className="text-center text-muted py-4">Nenhuma obrigação selecionada ou detalhes não encontrados.</div>
                )}
              </div>
              <div className="modal-footer" id="taxes-modal-footer">
                <button
                  type="button"
                  className="btn btn-primary modern-btn rounded-pill"
                  onClick={handleCloseTaxDetailsModal}
                  id="taxes-close-button"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UrgentTaxTable;
