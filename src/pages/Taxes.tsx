import React, { useState, useEffect, ChangeEvent, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faSortUp, faSortDown, faInfoCircle, faSyncAlt, faTag, faUser, faCalendar, faEuroSign, faCheckCircle, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import './Taxes.css';
import useApi from '../hooks/useApi';

interface ObrigacaoFiscal {
    identificadorUnico: string;
    tipo: string;
    dataLimite: string;
    clientName: string;
    valor: string;
    estado: string;
    json: string;
}

const Taxes = () => {
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const apiUrl = `atmate-gateway/tax/getTaxes?refresh=${refreshTrigger}`;
    const { data: obrigações, loading, error } = useApi<ObrigacaoFiscal[]>(apiUrl);
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

    useEffect(() => {
        if (obrigações) {
            const tiposUnicos = [...new Set(obrigações.map(o => o.tipo))];
            setTiposDeObrigacao(['Todos', ...tiposUnicos]);

            const estadosUnicos = [...new Set(obrigações.map(o => o.estado))];
            setEstadosDisponiveis(['Todos', ...estadosUnicos]);
        }
        if (obrigações && obrigações.length > 0) {
            const now = new Date();
            setLastUpdated(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
        }
        setIsRefreshing(false);
    }, [obrigações]);

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        setRefreshTrigger(prev => prev + 1);
    }, [setIsRefreshing, setRefreshTrigger]);

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
        setSelectedObrigacao(obrigacao);
    };

    const handleCloseModal = () => {
        setSelectedObrigacao(null);
    };

    const filteredObrigações = (obrigações || []).filter((obrigacao) => {
        const searchRegex = new RegExp(searchTerm, 'i');
        const typeMatch = filterType === 'Todos' || obrigacao.tipo === filterType;
        const dateMatch =
            (!fromDate || new Date(obrigacao.dataLimite) >= new Date(fromDate)) &&
            (!toDate || new Date(obrigacao.dataLimite) <= new Date(toDate));
        const estadoMatch = estadoFilter === 'Todos' || obrigacao.estado === estadoFilter;
        const searchMatch = searchRegex.test(obrigacao.identificadorUnico) ||
                            searchRegex.test(obrigacao.tipo) ||
                            searchRegex.test(obrigacao.dataLimite) ||
                            searchRegex.test(obrigacao.clientName) ||
                            searchRegex.test(obrigacao.valor) ||
                            searchRegex.test(obrigacao.estado);
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
                } else {
                    comparison = 0;
                }
                break;
            case 'valor':
                const valorA = parseFloat(String(a.valor).replace(' €', '').replace('.', '').replace(',', '.'));
                const valorB = parseFloat(String(b.valor).replace(' €', '').replace('.', '').replace(',', '.'));
                if (typeof valorA === 'number' && !isNaN(valorA) && typeof valorB === 'number' && !isNaN(valorB)) {
                    comparison = valorA - valorB;
                } else {
                    comparison = 0;
                }
                break;
            case 'estado':
                comparison = a.estado.localeCompare(b.estado);
                break;
            case 'clientName':
                comparison = a.clientName.localeCompare(b.clientName);
                break;
            default:
                break;
        }
        return sortDirection === 'asc' ? comparison : comparison * -1;
    });

    const cellStyle = {
        verticalAlign: 'middle',
    };

    if (loading) {
        return <div className="container mt-5 text-center">A carregar obrigações fiscais...</div>;
    }

    if (error) {
        return <div className="container mt-5 text-center">Erro ao obter as obrigações fiscais.</div>;
    }

    return (
        <div className="container-fluid mt-5 animate-fade-in">
            <div className="d-flex justify-content-between align-items-center" onClick={handleRefresh}>
                {lastUpdated && (
                    <p className="text-muted mr-3">
                        <FontAwesomeIcon
                            icon={faSyncAlt}
                            className="mr-2"
                            style={{ cursor: 'pointer' }}
                            spin={isRefreshing}
                        />
                         
                        Última atualização: {lastUpdated}
                    </p>
                )}
                {!lastUpdated && <p className="text-muted mr-3">Aguardando dados...</p>}
            </div>

            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex gap-2 align-items-center">
                    <div className="d-flex gap-2 align-items-center">
                        <label htmlFor="fromDate" className="form-label m-0 text-secondary small">De:</label>
                        <input
                            type="date"
                            className="form-control form-control-sm"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            id="fromDate"
                        />
                    </div>
                    <div className="d-flex gap-2 align-items-center">
                        <label htmlFor="toDate" className="form-label m-0 text-secondary small">Até:</label>
                        <input
                            type="date"
                            className="form-control form-control-sm"
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
                        {estadosDisponiveis.slice(1).map(estado => (
                            <option key={estado} value={estado}>{estado}</option>
                        ))}
                    </select>
                    <select
                        className="form-select form-select-sm rounded-md border-gray-300 text-gray-700 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        id="filterType"
                        value={filterType}
                        onChange={handleFilterType}
                    >
                        <option value="Todos">Tipo</option>
                        {tiposDeObrigacao.slice(1).map(tipo => (
                            <option key={tipo} value={tipo}>{tipo}</option>
                        ))}
                    </select>
                </div>

                <div className="d-flex justify-content-end">
                    <div className="position-relative d-flex align-items-center search-bar-container">
                        <div className="position-absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none search-icon">
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
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-4 text-muted">A carregar dados...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={7} className="text-center py-4 text-danger">Erro ao obter os dados.</td></tr>
                            ) : (obrigações || []).length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-4 text-muted">Nenhuma obrigação fiscal encontrada.</td>
                                </tr>
                            ) : (
                                sortedObrigações.map((obrigacao) => (
                                    <tr key={obrigacao.identificadorUnico}>
                                        <td style={cellStyle} className="text-secondary">{obrigacao.identificadorUnico}</td>
                                        <td style={cellStyle} className="text-secondary">{obrigacao.tipo}</td>
                                        <td style={cellStyle} className="text-secondary">{obrigacao.dataLimite}</td>
                                        <td style={cellStyle} className="text-secondary">{obrigacao.clientName}</td>
                                        <td style={cellStyle} className="text-end text-secondary">{obrigacao.valor}</td>
                                        <td style={cellStyle} className="text-center">
                                            <span
                                                className={`badge rounded-pill ${
                                                    obrigacao.estado === 'Pendente' ? 'bg-warning text-dark' :
                                                    obrigacao.estado === 'Pago' ? 'bg-success' :
                                                    'bg-danger'
                                                }`}
                                            >
                                                {obrigacao.estado}
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
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal for displaying details */}
            <div className="modal fade" id="taxes-details-modal" tabIndex={-1} aria-labelledby="taxes-details-modal-label" aria-hidden="true">
                <div className="modal-dialog modal-lg modal-dialog-centered">
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
                                            <div className="detail-row" id="taxes-detail-row-referencia">
                                                <FontAwesomeIcon icon={faFileAlt} className="detail-icon" />
                                                <span className="detail-label">
                                                    {selectedObrigacao.tipo === 'IMI' ? 'Nota Cobrança:' : selectedObrigacao.tipo === 'IUC' ? 'Matrícula:' : 'Referência:'}
                                                </span>
                                                <span className="detail-value">{selectedObrigacao.identificadorUnico}</span>
                                            </div>
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
                                                <span className={`badge modern-badge ${
                                                    selectedObrigacao.estado === 'Pendente' ? 'badge-pending' :
                                                    selectedObrigacao.estado === 'Pago' ? 'badge-paid' :
                                                    'badge-canceled'
                                                }`}>
                                                    {selectedObrigacao.estado}
                                                </span>
                                            </div>
                                            {(() => {
                                                try {
                                                    const jsonData = JSON.parse(selectedObrigacao.json);
                                                    return Object.entries(jsonData).map(([key, value]) => (
                                                        (key !== 'Situação' && key !== 'Nº Nota Cob.' && key !== 'Valor' && key !== 'Data Lim. Pag.' && key !== 'Matrícula' && key !== 'Situação da Nota' && key !== 'Data Limite de Pagamento') && (
                                                            <div className="detail-row" key={key} id={`taxes-detail-row-${key.toLowerCase().replace(/\s/g, '-')}`}>
                                                                <FontAwesomeIcon icon={faFileAlt} className="detail-icon" />
                                                                <span className="detail-label">{key}:</span>
                                                                <span className="detail-value">{String(value)}</span>
                                                            </div>
                                                        )
                                                    ));
                                                } catch (e) {
                                                    return (
                                                        <div className="detail-row text-danger" id="taxes-detail-row-error">
                                                            <FontAwesomeIcon icon={faFileAlt} className="detail-icon" />
                                                            <span className="detail-label">Erro:</span>
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

export default Taxes;