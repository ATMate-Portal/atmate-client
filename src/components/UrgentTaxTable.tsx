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

// Interface for the basic tax data passed in props.
// This should match the structure of the tax objects coming from ClientAccordionItem.
interface Tax {
  taxId: number;
  taxData: string; // The JSON string containing detailed tax information
  type: number;    // Numeric type from the parent component (e.g., for initial table display)
  licensePlate: string; // Directly available for quick access if needed
  amount: string;
  paymentDeadline: string;
  daysLeft: number;
}

// Interface for the structured data used by the modal, parsed from taxData.json
interface DetailedTaxModalData {
  identificadorUnico: string;
  tipo: string; // String type (e.g., "IUC", "IMI") from the parsed taxData.json
  dataLimite: string;
  clientName?: string; // Optional, as it might not be in taxData
  valor: string;
  estado?: string;   // Optional
  json: string;     // The original taxData JSON string, for the modal's internal parsing logic
  taxId: number;
}

interface Props {
  taxes: Tax[]; // Array of Tax objects, each containing taxData
  // clientId?: number; // If needed for API call or context (not used in this version)
}

// Helper functions (ideally, these should be in a shared utils file)
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

const formatValue = (value: any): string => {
    const trimmedValue = String(value).trim();
    if (trimmedValue.toLowerCase() === 'true') return 'Sim';
    if (trimmedValue.toLowerCase() === 'false') return 'Não';
    return trimmedValue;
};

const fieldsToExclude = [ // Fields to exclude when generically rendering from JSON
    'Nif', 'Nif Loc', 'Matricula', 'Data Pais E E E', 'Transporte G O',
    'Data da primeira matricula', 'Matricula Value', 'data1Matricula',
    // Also exclude fields that are explicitly handled or part of a sub-object like detalhes_veiculo at the top level of the JSON
    'type', // String type from JSON, already used for selectedTaxForModal.tipo
    'Valor Base', // Already used for selectedTaxForModal.valor
    'Data Limite de Pagamento', // Already used for selectedTaxForModal.dataLimite
    'Situação da Nota', // Already used for selectedTaxForModal.estado
    'Cat. IUC', // Part of details_veiculo or specific display logic
    'clientName' // Already handled if present
];


const UrgentTaxTable: React.FC<Props> = ({ taxes }) => {
  const [selectedTaxForModal, setSelectedTaxForModal] = useState<DetailedTaxModalData | null>(null);
  const [showTaxDetailModal, setShowTaxDetailModal] = useState(false);
  const [loadingModalDetails, setLoadingModalDetails] = useState(false); // Kept for UX consistency
  const [modalError, setModalError] = useState<string | null>(null);
  const [showVehicleDetails, setShowVehicleDetails] = useState(false);

  // This function now processes the local taxData string instead of fetching
  const processTaxDataForModal = (tax: Tax): DetailedTaxModalData => {
    const parsedJson = JSON.parse(tax.taxData);

    // Construct DetailedTaxModalData from the parsed JSON and the base Tax object
    return {
      taxId: tax.taxId,
      identificadorUnico: parsedJson.Matrícula || // For IUC, from taxData JSON (e.g., "62-BP-58")
                          parsedJson["Nº Nota Cob."] || // For IMI (key might vary, ensure it matches your JSON)
                          parsedJson.identificadorUnico || // Generic identifier in JSON
                          tax.licensePlate || // Fallback to licensePlate from the Tax prop
                          `REF-${tax.taxId}`, // Ultimate fallback
      tipo: parsedJson.type || // Prefer string 'type' from taxData JSON (e.g., "IUC")
            getTaxTypeDescriptionFromNumeric(tax.type), // Fallback to converting numeric type
      dataLimite: parsedJson["Data Limite de Pagamento"] || tax.paymentDeadline,
      clientName: parsedJson.clientName, // Will be undefined if not in taxData JSON
      valor: parsedJson["Valor Base"] || parsedJson.amount || tax.amount,
      estado: parsedJson["Situação da Nota"] || "Desconhecido",
      json: tax.taxData, // Pass the original JSON string for the modal's internal parsing of sub-objects
    };
  };

  const handleOpenTaxDetailsModal = (tax: Tax) => {
    setLoadingModalDetails(true);
    setShowTaxDetailModal(true);
    setSelectedTaxForModal(null);
    setShowVehicleDetails(false);
    setModalError(null);

    try {
      // Process the taxData to prepare it for the modal
      const detailedData = processTaxDataForModal(tax);
      setSelectedTaxForModal(detailedData);
    } catch (error: any) {
      console.error("Error processing tax data for modal:", error);
      setModalError("Erro ao processar os dados do imposto para o modal. Verifique o formato do JSON em taxData.");
    } finally {
      setLoadingModalDetails(false);
    }
  };

  const handleCloseTaxDetailsModal = () => {
    setShowTaxDetailModal(false);
    setSelectedTaxForModal(null);
    setModalError(null);
    setLoadingModalDetails(false);
    setShowVehicleDetails(false);
  };

  const toggleVehicleDetails = () => {
    setShowVehicleDetails(prev => !prev);
  };

  // Converts the numeric type from props to a display string for the table
  const getTaxTypeDescriptionFromNumeric = (typeNumber: number): string => {
    // This mapping should align with how numeric types are intended to be displayed initially
    // The modal will prefer the string 'type' from the parsed taxData.json
    switch (typeNumber) {
      // Example, assuming your numeric types map like this:
      // case 1: return "IVA"; (If '1' means IVA)
      // case 2: return "IRS"; (If '2' means IRS)
      // case 3: return "IUC"; (If '3' means IUC)
      // For the provided example, the `taxData.type` is a string "IUC",
      // but the `Tax` interface in `Home.tsx` has `type: number`.
      // We need to ensure this function correctly maps the *numeric* type.
      // The example JSON shows "type": "IUC" in taxData, and the outer Tax object has "type": "IUC" (string).
      // This suggests the `Tax` interface in `Home.tsx` might actually have `type: string` or `tax.type` in `ClientAccordionItem`
      // is already the string. If `tax.type` passed to this component is truly numeric, this function is fine.
      // If `tax.type` is already a string like "IUC", this function might not be strictly needed for the table,
      // or it should handle string inputs too.
      // Given `interface Tax { type: number; ...}` in this file, I'll keep it for numeric input.
      // The modal will use `parsedJson.type` (string) preferentially.
        case 1: return "IVA"; // Placeholder, adjust to your numeric type mapping
        case 2: return "IRS"; // Placeholder
        case 3: return "IUC"; // Placeholder
        default: return `${typeNumber}`;
    }
  };


  return (
    <>
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
              taxes.map((tax) => (
                <tr key={tax.taxId}>
                  {/* Use getTaxTypeDescriptionFromNumeric if tax.type is number, or tax.type directly if it's already string */}
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
              <tr>
                <td colSpan={5} className="text-center text-muted py-3">
                  Não existem impostos urgentes para este cliente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tax Details Modal - Structure Replicated from TaxesTable.tsx context */}
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
              <div className="modal-header" id="taxes-modal-header"> {/* Ensure CSS for #taxes-modal-header provides white text for btn-close-white */}
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
                {loadingModalDetails ? (
                  <div className="text-center py-5">
                    <FontAwesomeIcon icon={faSpinner} spin size="3x" />
                    <p className="mt-2">A carregar...</p>
                  </div>
                ) : modalError ? (
                  <div className="alert alert-danger">{modalError}</div>
                ) : selectedTaxForModal ? (
                  <div id="taxes-details-container">
                    <div id="taxes-details-card"> {/* Ensure CSS for #taxes-details-card and list items */}
                      <h6 className="card-title" id="taxes-card-title">
                        <FontAwesomeIcon icon={faTag} className="me-2" />
                        Detalhes da Obrigação Fiscal
                      </h6>
                      <div id="taxes-details-list">
                        <div className="detail-row" id="taxes-detail-row-tipo">
                          <FontAwesomeIcon icon={faTag} className="detail-icon" /> {/* Ensure CSS for .detail-icon, .detail-label, .detail-value */}
                          <span className="detail-label">Tipo:</span>
                          <span className="detail-value">{selectedTaxForModal.tipo}</span>
                        </div>
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
                        {selectedTaxForModal.clientName && ( // Will only show if clientName was in taxData JSON
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
                        {/* Generic JSON data display from selectedTaxForModal.json */}
                        {(() => {
                          try {
                            const jsonDataFromModalState = JSON.parse(selectedTaxForModal.json);
                            const generalEntries = Object.entries(jsonDataFromModalState).filter(
                              ([key, value]) => 
                                key !== 'detalhes_veiculo' &&
                                !fieldsToExclude.includes(key) &&
                                !fieldsToExclude.includes(formatFieldName(key)) && // Check formatted key too
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
                  className="btn btn-primary modern-btn rounded-pill" // Ensure .modern-btn is styled
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
