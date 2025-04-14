import React, { useState, useEffect, ChangeEvent, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faSortUp, faSortDown, faInfoCircle, faSyncAlt } from '@fortawesome/free-solid-svg-icons';
import './Taxes.css';
import useApi from '../hooks/useApi';

interface ObrigacaoFiscal {
    identificadorUnico: string;
    tipo: string;
    dataLimite: string;
    clientName: string;
    valor: string;
    estado: string;
}

const Taxes = () => {
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const apiUrl = `atmate-gateway/tax/getTaxes?refresh=${refreshTrigger}`;
    const { data: obrigações, loading, error } = useApi<ObrigacaoFiscal[]>(apiUrl);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('Todos');
    const [tiposDeFiltro, setTiposDeFiltro] = useState<string[]>(['Todos']);
    const [sortBy, setSortBy] = useState<keyof ObrigacaoFiscal>('dataLimite');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
        if (obrigações) {
            const tipos = ['Todos', ...new Set(obrigações.map(o => o.tipo))];
            setTiposDeFiltro(tipos);
        }
        if (obrigações && obrigações.length > 0) {
            const now = new Date();
            setLastUpdated(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
        }
        setRefreshing(false);
    }, [obrigações]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        setRefreshTrigger(prev => prev + 1);
    }, [setRefreshing, setRefreshTrigger]);

    const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const handleFilter = (event: ChangeEvent<HTMLSelectElement>) => {
        setFilterType(event.target.value);
    };

    const handleSort = (column: keyof ObrigacaoFiscal) => {
        if (sortBy === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortDirection('asc');
        }
    };

    const filteredObrigações = (obrigações || []).filter((obrigacao) => {
        const searchRegex = new RegExp(searchTerm, 'i');
        const typeMatch = filterType === 'Todos' || obrigacao.tipo === filterType;
        const searchMatch = searchRegex.test(obrigacao.identificadorUnico) || // Added this line
                            searchRegex.test(obrigacao.tipo) ||
                            searchRegex.test(obrigacao.dataLimite) ||
                            searchRegex.test(obrigacao.clientName) ||
                            searchRegex.test(obrigacao.valor) ||
                            searchRegex.test(obrigacao.estado);
        return typeMatch && searchMatch;
    });

    const sortedObrigações = [...filteredObrigações].sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'identificadorUnico') {
            comparison = a.identificadorUnico.localeCompare(b.identificadorUnico);
        } else if (sortBy === 'tipo') {
            comparison = a.tipo.localeCompare(b.tipo);
        } else if (sortBy === 'dataLimite') {
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
        } else if (sortBy === 'valor') {
            const valorA = parseFloat(String(a.valor).replace(' €', '').replace('.', '').replace(',', '.'));
            const valorB = parseFloat(String(b.valor).replace(' €', '').replace('.', '').replace(',', '.'));
            if (typeof valorA === 'number' && !isNaN(valorA) && typeof valorB === 'number' && !isNaN(valorB)) {
                comparison = valorA - valorB;
            } else {
                comparison = 0;
            }
        } else if (sortBy === 'estado') {
            comparison = a.estado.localeCompare(b.estado);
        } else if (sortBy === 'clientName') {
            comparison = a.clientName.localeCompare(b.clientName);
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
          <div className="d-flex align-items-center">  
            <div>
                {lastUpdated && (
                    <p className="text-muted mr-3">
                        <FontAwesomeIcon
                            icon={faSyncAlt}
                            className="mr-2"
                            style={{ cursor: 'pointer' }}
                            onClick={handleRefresh}
                            spin={refreshing}
                        />
                        &nbsp;
                        Última atualização: {lastUpdated}
                    </p>
                )}
                {!lastUpdated && <p className="text-muted mr-3">Aguardando dados...</p>}
            </div>
            </div>
            <div className="mb-4 d-flex gap-2">
                <select
                    className="form-select form-select-sm rounded-md border-gray-300 text-gray-700 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    id="filterType"
                    value={filterType}
                    onChange={handleFilter}
                >
                    {tiposDeFiltro.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    </div>
                    <input
                    type="text"
                    className="form-control form-control-sm rounded-md border-gray-300 pl-10 text-gray-700 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    id="searchInput"
                    placeholder="Pesquisar..."
                    value={searchTerm}
                    onChange={handleSearch}
                    />
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
                                            <button className="btn btn-sm btn-outline-secondary rounded-pill shadow-sm">
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
        </div>
    );
};

export default Taxes;