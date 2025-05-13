import React, { useState, useEffect, ChangeEvent, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faSortUp, faSortDown, faInfoCircle, faSyncAlt, faTag, faUser, faCalendar, faEuroSign, faCheckCircle, faFileAlt, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import '../pages/Taxes.css'; // Ensure this CSS file has the .badge-anulada, .badge-emitida, etc. styles

interface ObrigacaoFiscal {
    identificadorUnico: string;
    tipo: string;
    dataLimite: string;
    clientName: string;
    valor: string;
    estado: string;
    json: string;
}

interface TaxesTableProps {
    obrigações: ObrigacaoFiscal[] | null;
    loading: boolean;
    error: string; 
    onRefresh: () => void;
    lastUpdated: string | null;
    isRefreshing: boolean;
}

// Revised helper function to get badge class for modal and table
const getBadgeClassForEstado = (estado?: string): string => {
    if (!estado) return 'badge-secondary'; // Fallback for undefined/empty string

    let currentEstado = estado;
    if (estado === "-") {
        currentEstado = "Pendente";
    }

    // Normalize to lowercase for .includes() checks to make them case-insensitive
    const lowerEstado = currentEstado.toLowerCase();

    // Exact matches for primary states (case-sensitive for the original value if needed)
    if (currentEstado === "Pendente") return 'badge-pending';
    if (currentEstado === "Pago" || currentEstado === "Paga") return 'badge-paid';
    if (currentEstado === "Anulada") return 'badge-anulada';
    if (currentEstado === "Emitida") return 'badge-emitida'; 
    if (currentEstado === "Pendente de Emissão") return 'badge-pendente-emissao';

    // Handle cases with .includes() for more flexibility, order can be important
    if (lowerEstado.includes('pendente de emissão')) return 'badge-pendente-emissao';
    if (lowerEstado.includes('emitida')) return 'badge-emitida'; 
    if (lowerEstado.includes('anulada')) return 'badge-anulada';
    if (lowerEstado.includes('paga')) return 'badge-paid'; 
    
    if (lowerEstado.includes('pendente')) return 'badge-pending';
    
    return 'badge-secondary'; 
};


const TaxesTable: React.FC<TaxesTableProps> = ({ obrigações, loading, error, onRefresh, lastUpdated, isRefreshing }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('Todos');
    const [tiposDeObrigacao, setTiposDeObrigacao] = useState<string[]>(['Todos']);
    const [sortBy, setSortBy] = useState<keyof ObrigacaoFiscal>('dataLimite');
    const [fromDate, setFromDate] = useState<string>('');
    const [toDate, setToDate] = useState<string>('');
    const [estadoFilter, setEstadoFilter] = useState<string>('Todos');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [estadosDisponiveis, setEstadosDisponiveis] = useState<string[]>(['Todos']);
    const [selectedObrigacao, setSelectedObrigacao] = useState<ObrigacaoFiscal | null>(null);
    const [showVehicleDetails, setShowVehicleDetails] = useState(false);

    // Utility function to format field names
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

    // Utility function to format values
    const formatValue = (value: any): string => {
        const trimmedValue = String(value).trim();
        if (trimmedValue.toLowerCase() === 'true') return 'Sim';
        if (trimmedValue.toLowerCase() === 'false') return 'Não';
        return trimmedValue;
    };

    const fieldsToExclude = [
        'Nif',
        'Nif Loc',
        'Matricula',
        'Data Pais E E E',
        'Transporte G O',
        'Data da primeira matricula',
        'Matricula Value',
        'data1Matricula'
    ];

    useEffect(() => {
        if (obrigações) {
            const tiposUnicos = [...new Set(obrigações.map(o => o.tipo))];
            setTiposDeObrigacao(['Todos', ...tiposUnicos]);

            const estadosProcessadosParaFiltro = obrigações.map(o => o.estado === '-' ? 'Pendente' : o.estado);
            const estadosUnicos = [...new Set(estadosProcessadosParaFiltro)];
            setEstadosDisponiveis(['Todos', ...estadosUnicos]);
        }
    }, [obrigações]);

    const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const handleFilterType = (event: ChangeEvent<HTMLSelectElement>) => {
        setFilterType(event.target.value);
    };

    const handleFilterEstado = (event: ChangeEvent<HTMLSelectElement>) => {
        setEstadoFilter(event.target.value);
    };

    const handleSort = (column: keyof ObrigacaoFiscal) => {
        if (sortBy === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortDirection('asc');
        }
    };

    const handleShowDetails = (obrigacao: ObrigacaoFiscal) => {
        console.log("Selected Obrigacao Estado for Modal:", obrigacao.estado); 
        setSelectedObrigacao(obrigacao);
        setShowVehicleDetails(false);
    };

    const handleCloseModal = () => {
        setSelectedObrigacao(null);
        setShowVehicleDetails(false);
    };

    const toggleVehicleDetails = () => {
        setShowVehicleDetails(prev => !prev);
    };

    const filteredObrigações = (obrigações || []).filter((obrigacao) => {
        const typeMatch = filterType === 'Todos' || obrigacao.tipo === filterType;
        
        const dateMatch =
            (!fromDate || new Date(obrigacao.dataLimite) >= new Date(fromDate)) &&
            (!toDate || new Date(obrigacao.dataLimite) <= new Date(toDate));
        
        const estadoParaFiltro = obrigacao.estado === '-' ? 'Pendente' : obrigacao.estado;
        const estadoMatch = estadoFilter === 'Todos' || estadoParaFiltro === estadoFilter;
        
        const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const normalizedSearch = normalize(searchTerm);

        const searchFields = [
            obrigacao.identificadorUnico,
            obrigacao.tipo,
            obrigacao.dataLimite,
            obrigacao.clientName,
            String(obrigacao.valor),
            estadoParaFiltro 
        ];

        const searchMatch = searchFields.some(field => normalize(String(field)).includes(normalizedSearch)); // Ensure field is string

        return typeMatch && searchMatch && dateMatch && estadoMatch;
    });

    const sortedObrigações = [...filteredObrigações].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
            case 'identificadorUnico':
                comparison = a.identificadorUnico.localeCompare(b.identificadorUnico);
                break;
            case 'tipo':
                comparison = a.tipo.localeCompare(b.tipo);
                break;
            case 'dataLimite':
                const dateA = a.dataLimite ? new Date(a.dataLimite) : null;
                const dateB = b.dataLimite ? new Date(b.dataLimite) : null;
                if (dateA && dateB) {
                    comparison = dateA.getTime() - dateB.getTime();
                } else if (dateA) {
                    comparison = 1; 
                } else if (dateB) {
                    comparison = -1;
                }
                break;
            case 'valor':
                const valorA = parseFloat(String(a.valor).replace(' €', '').replace('.', '').replace(',', '.'));
                const valorB = parseFloat(String(b.valor).replace(' €', '').replace('.', '').replace(',', '.'));
                if (!isNaN(valorA) && !isNaN(valorB)) {
                    comparison = valorA - valorB;
                }
                break;
            case 'estado':
                const estadoA = a.estado === '-' ? 'Pendente' : a.estado;
                const estadoB = b.estado === '-' ? 'Pendente' : b.estado;
                comparison = estadoA.localeCompare(estadoB);
                break;
            case 'clientName':
                comparison = a.clientName.localeCompare(b.clientName);
                break;
        }
        return sortDirection === 'asc' ? comparison : comparison * -1;
    });

    const cellStyle = {
        verticalAlign: 'middle',
    };

    if (loading && !obrigações) {
        return <div className="container mt-5 text-center">A carregar obrigações fiscais...</div>;
    }

    if (error) {
        return <div className="container mt-5 text-center alert alert-danger">Erro ao obter as obrigações fiscais: {error}</div>;
    }

    return (
        <div className="container-fluid mt-5 animate-fade-in">
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">

                {lastUpdated && (
                    <p className="text-muted mb-0" onClick={onRefresh} style={{ cursor: 'pointer' }}>
                        <FontAwesomeIcon
                            icon={faSyncAlt}
                            className="mr-2 me-2"
                            spin={isRefreshing}
                        />
                        Última atualização: {lastUpdated}
                    </p>
                )}
                 {!lastUpdated && !loading && <p className="text-muted mb-0">Clique no ícone para atualizar.</p>}
            </div>

            <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">

                <div className="d-flex flex-wrap gap-2 align-items-center" style={{ flexGrow: 1 }}>
                    <div className="d-flex gap-2 align-items-center">
                        <label htmlFor="fromDate" className="form-label m-0 text-secondary small">De:</label>
                        <input
                            type="date"
                            className="form-control form-control-sm date-picker-input"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            id="fromDate"
                        />
                    </div>
                    <div className="d-flex gap-2 align-items-center">
                        <label htmlFor="toDate" className="form-label m-0 text-secondary small">Até:</label>
                        <input
                            type="date"
                            className="form-control form-control-sm date-picker-input"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            id="toDate"
                        />
                    </div>
                    <select
                        className="form-select form-select-sm"
                        value={estadoFilter}
                        onChange={handleFilterEstado}
                    >
                        <option value="Todos">Estados</option>
                        {estadosDisponiveis.filter(e => e !== "Todos").map(estado => (
                            <option key={estado} value={estado}>{estado}</option>
                        ))}
                    </select>
                    <select
                        className="form-select form-select-sm"
                        id="filterType"
                        value={filterType}
                        onChange={handleFilterType}
                    >
                        <option value="Todos">Tipo</option>
                        {tiposDeObrigacao.filter(t => t !== "Todos").map(tipo => (
                            <option key={tipo} value={tipo}>{tipo}</option>
                        ))}
                    </select>
                </div>

                <div className="d-flex justify-content-end">
                    <div className="position-relative d-flex align-items-center search-bar-container flex-grow-1">
                        <div className="search-icon">
                            <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            id="searchInput"
                            placeholder="Pesquisar..."
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                    </div>
                </div>
            </div>

            <div className="table-container">
                <div className="table-responsive w-100">
                    <table className="table table-borderless table-hover bg-white shadow-sm w-100">
                        <thead className="bg-light">
                            <tr>
                                <th style={cellStyle} onClick={() => handleSort('identificadorUnico')} className="cursor-pointer text-secondary">
                                    Referência <FontAwesomeIcon icon={sortBy === 'identificadorUnico' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" />
                                </th>
                                <th style={cellStyle} onClick={() => handleSort('tipo')} className="cursor-pointer text-secondary">
                                    Tipo <FontAwesomeIcon icon={sortBy === 'tipo' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" />
                                </th>
                                <th style={cellStyle} onClick={() => handleSort('dataLimite')} className="cursor-pointer text-secondary">
                                    Data Limite <FontAwesomeIcon icon={sortBy === 'dataLimite' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" />
                                </th>
                                <th style={cellStyle} onClick={() => handleSort('clientName')} className="cursor-pointer text-secondary">
                                    Cliente <FontAwesomeIcon icon={sortBy === 'clientName' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" />
                                </th>
                                <th style={cellStyle} onClick={() => handleSort('valor')} className="cursor-pointer text-end text-secondary">
                                    Valor a Pagar <FontAwesomeIcon icon={sortBy === 'valor' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" />
                                </th>
                                <th style={cellStyle} onClick={() => handleSort('estado')} className="cursor-pointer text-center text-secondary">
                                    Estado <FontAwesomeIcon icon={sortBy === 'estado' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" />
                                </th>
                                <th style={cellStyle} className="text-center text-secondary">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && sortedObrigações.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-4 text-muted">A carregar dados...</td></tr>
                            ) : sortedObrigações.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-4 text-muted">Nenhuma obrigação fiscal encontrada.</td>
                                </tr>
                            ) : (
                                sortedObrigações.map((obrigacao) => {
                                    const estadoTextParaExibir = obrigacao.estado === '-' ? 'Pendente' : obrigacao.estado;
                                    const classeDoBadge = getBadgeClassForEstado(obrigacao.estado); // Use the unified function

                                    return (
                                        <tr key={obrigacao.identificadorUnico}>
                                            <td style={cellStyle} className="text-secondary">{obrigacao.identificadorUnico}</td>
                                            <td style={cellStyle} className="text-secondary">{obrigacao.tipo}</td>
                                            <td style={cellStyle} className="text-secondary">{obrigacao.dataLimite}</td>
                                            <td style={cellStyle} className="text-secondary">{obrigacao.clientName}</td>
                                            <td style={cellStyle} className="text-end text-secondary">{obrigacao.valor}</td>
                                            <td style={cellStyle} className="text-center">
                                                {/* Apply modern-badge for consistent styling with modal if desired, or just badge + color class */}
                                                <span className={`badge modern-badge ${classeDoBadge}`}>
                                                    {estadoTextParaExibir}
                                                </span>
                                            </td>
                                            <td style={cellStyle} className="text-center">
                                                <button
                                                    className="btn btn-sm btn-outline-primary rounded-pill shadow-sm"
                                                    onClick={() => handleShowDetails(obrigacao)}
                                                    data-bs-toggle="modal"
                                                    data-bs-target="#taxes-details-modal"
                                                >
                                                    <FontAwesomeIcon icon={faInfoCircle} className="me-1" /> Ver Detalhes
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Detalhes da Obrigação Fiscal */}
            <div className="modal fade" id="taxes-details-modal" tabIndex={-1} aria-labelledby="taxes-details-modal-label" aria-hidden="true">
                <div className="modal-dialog modal-xl modal-dialog-centered">
                    <div className="modal-content" id="taxes-modal-content">
                        <div className="modal-header" id="taxes-modal-header">
                            <h5 className="modal-title" id="taxes-details-modal-label">
                                <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                                {selectedObrigacao?.tipo} - {selectedObrigacao?.identificadorUnico}
                            </h5>
                            <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close" onClick={handleCloseModal}></button>
                        </div>
                        <div className="modal-body" id="taxes-modal-body">
                            {selectedObrigacao ? (
                                <div id="taxes-details-container">
                                    <div id="taxes-details-card">
                                        <h6 className="card-title" id="taxes-card-title">
                                            <FontAwesomeIcon icon={faTag} className="me-2" />
                                            Detalhes da Obrigação Fiscal
                                        </h6>
                                        <div id="taxes-details-list">
                                            <div className="detail-row" id="taxes-detail-row-tipo">
                                                <FontAwesomeIcon icon={faTag} className="detail-icon" />
                                                <span className="detail-label">Tipo:</span>
                                                <span className="detail-value">{selectedObrigacao.tipo}</span>
                                            </div>
                                            <div 
                                                className="detail-row d-flex align-items-center" 
                                                id="taxes-detail-row-referencia"
                                                style={{ cursor: selectedObrigacao.tipo === 'IUC' ? 'pointer' : 'default' }}
                                                onClick={selectedObrigacao.tipo === 'IUC' ? toggleVehicleDetails : undefined}
                                            >
                                                <FontAwesomeIcon icon={faFileAlt} className="detail-icon me-2" />
                                                <span className="detail-label">
                                                    {selectedObrigacao.tipo === 'IMI' ? 'Nota Cobrança:' : selectedObrigacao.tipo === 'IUC' ? 'Matrícula:' : 'Referência:'}
                                                </span>
                                                <span className="detail-value flex-grow-1">{selectedObrigacao.identificadorUnico}</span>
                                                {selectedObrigacao.tipo === 'IUC' && (
                                                    <FontAwesomeIcon 
                                                        icon={showVehicleDetails ? faChevronUp : faChevronDown} 
                                                        className="ms-2 text-muted"
                                                    />
                                                )}
                                            </div>
                                            {selectedObrigacao.tipo === 'IUC' && showVehicleDetails && (
                                                <div className="detail-row ms-4 mt-2" id="taxes-detail-row-vehicle-details">
                                                    <div className="card p-3 bg-light">
                                                        <h6 className="mb-3">Detalhes do Veículo</h6>
                                                        {(() => {
                                                            try {
                                                                const jsonData = JSON.parse(selectedObrigacao.json);
                                                                const vehicleDetails = jsonData.detalhes_veiculo || {};
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
                                                                        <div 
                                                                            className="detail-row mb-2" 
                                                                            key={`vehicle-${safeKey}`} 
                                                                            id={`taxes-detail-row-vehicle-${safeKey}`}
                                                                        >
                                                                            <FontAwesomeIcon icon={faFileAlt} className="detail-icon me-2" />
                                                                            <span className="detail-label">{formattedKey}:</span>
                                                                            <span className="detail-value">{formattedValue}</span>
                                                                        </div>
                                                                    );
                                                                });
                                                            } catch (e) {
                                                                return (
                                                                    <div className="detail-row text-danger" id="taxes-detail-row-vehicle-error">
                                                                        <FontAwesomeIcon icon={faFileAlt} className="detail-icon me-2" />
                                                                        <span className="detail-value">Não foi possível carregar os detalhes do veículo.</span>
                                                                    </div>
                                                                );
                                                            }
                                                        })()}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="detail-row" id="taxes-detail-row-cliente">
                                                <FontAwesomeIcon icon={faUser} className="detail-icon" />
                                                <span className="detail-label">Cliente:</span>
                                                <span className="detail-value">{selectedObrigacao.clientName}</span>
                                            </div>
                                            <div className="detail-row" id="taxes-detail-row-data">
                                                <FontAwesomeIcon icon={faCalendar} className="detail-icon" />
                                                <span className="detail-label">Data Limite:</span>
                                                <span className="detail-value">{selectedObrigacao.dataLimite}</span>
                                            </div>
                                            <div className="detail-row" id="taxes-detail-row-valor">
                                                <FontAwesomeIcon icon={faEuroSign} className="detail-icon" />
                                                <span className="detail-label">Valor:</span>
                                                <span className="detail-value">{selectedObrigacao.valor}</span>
                                            </div>
                                            <div className="detail-row" id="taxes-detail-row-estado">
                                                <FontAwesomeIcon icon={faCheckCircle} className="detail-icon" />
                                                <span className="detail-label">Estado:</span>
                                                <span className={`badge modern-badge ${getBadgeClassForEstado(selectedObrigacao.estado)}`}>
                                                    {selectedObrigacao.estado === '-' ? 'Pendente' : selectedObrigacao.estado}
                                                </span>
                                            </div>
                                            {(() => {
                                                try {
                                                    const jsonData = JSON.parse(selectedObrigacao.json);
                                                    const generalEntries = Object.entries(jsonData).filter(
                                                        ([key]) =>
                                                            key !== 'detalhes_veiculo' && 
                                                            !fieldsToExclude.includes(key) &&
                                                            !fieldsToExclude.includes(formatFieldName(key)) &&
                                                            key.toLowerCase() !== 'tipo' && 
                                                            key.toLowerCase() !== 'identificadorunico' &&
                                                            key.toLowerCase() !== 'datalimite' && 
                                                            key.toLowerCase() !== 'clientname' &&
                                                            key.toLowerCase() !== 'valor' && 
                                                            key.toLowerCase() !== 'estado' &&
                                                            key.toLowerCase() !== 'situação da nota' && 
                                                            key.toLowerCase() !== 'matrícula' && 
                                                            key.toLowerCase() !== 'nº nota cob.' && 
                                                            key.toLowerCase() !== 'valor base' && 
                                                            key.toLowerCase() !== 'data limite de pagamento' && 
                                                            jsonData[key] != null &&
                                                            String(jsonData[key]).trim() !== '' &&
                                                            String(jsonData[key]).toLowerCase() !== 'null' &&
                                                            String(jsonData[key]) !== '-'
                                                    );
                                                    if (generalEntries.length === 0 && !jsonData.detalhes_veiculo) {
                                                         return null; 
                                                    }
                                                    return generalEntries.map(([key, value]) => {
                                                        const safeKey = key.toLowerCase().replace(/[^a-z0-9]/g, '-');
                                                        const formattedKey = formatFieldName(key);
                                                        const formattedValue = formatValue(value);
                                                        return (
                                                            <div className="detail-row" key={`general-${safeKey}`} id={`taxes-detail-row-${safeKey}`}>
                                                                <FontAwesomeIcon icon={faFileAlt} className="detail-icon" />
                                                                <span className="detail-label">{formattedKey}:</span>
                                                                <span className="detail-value">{formattedValue}</span>
                                                            </div>
                                                        );
                                                    });
                                                } catch (e) {
                                                    return (
                                                        <div className="detail-row text-danger" id="taxes-detail-row-json-error">
                                                            <FontAwesomeIcon icon={faFileAlt} className="detail-icon" />
                                                            <span className="detail-value">Não foi possível carregar os detalhes adicionais.</span>
                                                        </div>
                                                    );
                                                }
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-muted">
                                    Nenhuma obrigação selecionada.
                                </div>
                            )}
                        </div>
                        <div className="modal-footer" id="taxes-modal-footer">
                            <button
                                type="button"
                                className="btn btn-primary modern-btn rounded-pill"
                                data-bs-dismiss="modal"
                                onClick={handleCloseModal}
                                id="taxes-close-button"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaxesTable;
