import React, { useState, useEffect, ChangeEvent } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSearch,
    faSortUp,
    faSortDown,
    faSyncAlt,
    faArrowLeft,
    faArrowRight,
} from '@fortawesome/free-solid-svg-icons';

// --- IMPORTS PARA REACT-DATEPICKER ---
import DatePicker, { registerLocale, setDefaultLocale } from 'react-datepicker';
import { pt } from 'date-fns/locale'; // Importa a localização portuguesa
import 'react-datepicker/dist/react-datepicker.css'; // Importa o CSS base
// --- FIM DOS IMPORTS ---

import './Taxes.css'; // Assume que este CSS contém estilos relevantes
import useApi from '../hooks/useApi';

// Registar e definir a localização portuguesa como padrão
registerLocale('pt', pt);
setDefaultLocale('pt');

// Interface Operation
interface Operation {
    id: number;
    userId: number;
    username: string;
    userAction: string;
    createdAt: string; // Vem como string (ISO 8601), será convertida para Date
}

// Interface Page
interface Page<T> {
    content: T[];
    pageable: any; // Simplificado para o exemplo
    last: boolean;
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
    sort: any; // Simplificado
    first: boolean;
    numberOfElements: number;
    empty: boolean;
}

// --- FUNÇÃO HELPER PARA FORMATAR DATA PARA API ---
const formatDateForApi = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`; // Formato YYYY-MM-DD
};
// --- FIM DA FUNÇÃO HELPER ---

const OperationHistory: React.FC = () => {
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [page, setPage] = useState(0);
    const [size] = useState(20);
    const [sortBy, setSortBy] = useState<keyof Operation>('createdAt');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterUserId, setFilterUserId] = useState<string>('');
    const [filterUserAction, setFilterUserAction] = useState<string>('');
    
    // --- ESTADOS DE DATA ATUALIZADOS ---
    const [fromDate, setFromDate] = useState<Date | null>(null);
    const [toDate, setToDate] = useState<Date | null>(null);
    // --- FIM DA ATUALIZAÇÃO ---

    const [estadoFilter, setEstadoFilter] = useState<string>('Todos'); // Mantido, mas não usado na API
    const [filterType, setFilterType] = useState<string>('Todos'); // Mantido, mas não usado na API

    // Mock data (ajustar se necessário)
    const estadosDisponiveis = ['Todos', 'Pendente', 'Concluído', 'Cancelado'];
    const tiposDeObrigacao = ['Todos', 'Tipo A', 'Tipo B', 'Tipo C'];

    // --- API URL ATUALIZADA ---
    // Usa formatDateForApi para enviar as datas no formato correto
    const apiUrl = `atmate-gateway/operation-history?page=${page}&size=${size}&sort=${sortBy},${sortDirection}${
        filterUserId ? `&userId=${filterUserId}` : ''
    }${filterUserAction ? `&userAction=${encodeURIComponent(filterUserAction)}` : ''}${
        fromDate ? `&startDate=${encodeURIComponent(formatDateForApi(fromDate))}` : ''
    }${toDate ? `&endDate=${encodeURIComponent(formatDateForApi(toDate))}` : ''}${
        estadoFilter !== 'Todos' ? `&estado=${encodeURIComponent(estadoFilter)}` : ''
    }${filterType !== 'Todos' ? `&type=${encodeURIComponent(filterType)}` : ''}&refresh=${refreshTrigger}`;
    // --- FIM DA ATUALIZAÇÃO ---

    const { data: pageData, loading, error } = useApi<Page<Operation>>(apiUrl);

    useEffect(() => {
        if (pageData && pageData.content.length > 0) {
            const now = new Date();
            setLastUpdated(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
        }
        setIsRefreshing(false);
    }, [pageData]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setRefreshTrigger((prev) => prev + 1);
    };

    const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };

    const handleSort = (column: keyof Operation) => {
        if (sortBy === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortDirection('desc');
        }
        setPage(0);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 0 && pageData && newPage < pageData.totalPages) {
            setPage(newPage);
        }
    };

    const handleUserIdFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
        setFilterUserId(event.target.value);
        setPage(0);
    };

    const handleUserActionFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
        setFilterUserAction(event.target.value);
        setPage(0);
    };

    // --- HANDLERS DE DATA REMOVIDOS ---
    // handleFromDateChange e handleToDateChange são substituídos pelo onChange do DatePicker

    const handleFilterEstado = (event: ChangeEvent<HTMLSelectElement>) => {
        setEstadoFilter(event.target.value);
        setPage(0);
    };

    const handleFilterType = (event: ChangeEvent<HTMLSelectElement>) => {
        setFilterType(event.target.value);
        setPage(0);
    };

    const handleClearFilters = () => {
        setFilterUserId('');
        setFilterUserAction('');
        setFromDate(null); // <-- ALTERADO PARA NULL
        setToDate(null);   // <-- ALTERADO PARA NULL
        setEstadoFilter('Todos');
        setFilterType('Todos');
        setSearchTerm('');
        setPage(0);
    };

    const uniqueUserIdsWithUsernames = Array.from(
        new Map(pageData?.content.map((op) => [op.userId, op.username])).entries()
    ).sort((a, b) => a[0] - b[0]);

    // O filtro client-side parece redundante se a API já filtra, mas mantido como estava.
    const filteredOperations = (pageData?.content || []).filter((operation) => {
        const searchRegex = new RegExp(searchTerm, 'i');
        return (
            searchRegex.test(operation.username) ||
            searchRegex.test(operation.userAction) ||
            searchRegex.test(operation.createdAt)
        );
    });

    const startItem = pageData ? (pageData.number * pageData.size) + 1 : 0;
    const endItem = pageData ? startItem + pageData.numberOfElements - 1 : 0;

    const cellStyle = { verticalAlign: 'middle' };

    if (loading) return <div className="container mt-5 text-center">A carregar histórico de operações...</div>;
    if (error) return <div className="container mt-5 text-center alert alert-danger">Erro ao obter o histórico de operações: {error.toString()}</div>;

    return (
        <div id="operation-history-page" className="container-fluid mt-5 animate-fade-in">
            <div className="d-flex justify-content-between align-items-center" >
                {lastUpdated && (
                    <p className="text-muted mr-3" onClick={handleRefresh}>
                        <FontAwesomeIcon icon={faSyncAlt} className="mr-2 me-2" style={{ cursor: 'pointer' }} spin={isRefreshing} />
                        Última atualização: {lastUpdated}
                    </p>
                )}
                {!lastUpdated && <p className="text-muted mr-3">Aguardando dados...</p>}
            </div>

            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex gap-2 align-items-center flex-wrap"> {/* Adicionado flex-wrap */}
                    <div className="d-flex gap-2 align-items-center">
                        <label htmlFor="fromDate" className="form-label m-0 text-secondary small">De:</label>
                        {/* --- DATEPICKER PARA FromDate --- */}
                        <DatePicker
                            selected={fromDate}
                            onChange={(date: Date | null) => { setFromDate(date); setPage(0); }}
                            selectsStart
                            startDate={fromDate}
                            endDate={toDate}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="dd/mm/yyyy"
                            className="form-control form-control-sm"
                            locale="pt"
                            isClearable
                            id="fromDate"
                            autoComplete="off"
                        />
                        {/* --- FIM --- */}
                    </div>
                    <div className="d-flex gap-2 align-items-center">
                        <label htmlFor="toDate" className="form-label m-0 text-secondary small">Até:</label>
                        {/* --- DATEPICKER PARA ToDate --- */}
                        <DatePicker
                            selected={toDate}
                            onChange={(date: Date | null) => { setToDate(date); setPage(0); }}
                            selectsEnd
                            startDate={fromDate}
                            endDate={toDate}
                            minDate={fromDate ?? undefined}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="dd/mm/yyyy"
                            className="form-control form-control-sm"
                            locale="pt"
                            isClearable
                            id="toDate"
                            autoComplete="off"
                        />
                        {/* --- FIM --- */}
                    </div>

                    <div>
                        <select id="userIdFilter" className="form-select form-select-sm" value={filterUserId} onChange={handleUserIdFilterChange} aria-label="Filtrar por utilizador">
                            <option value="">Utilizadores</option>
                            {uniqueUserIdsWithUsernames.map(([userId, username]) => (
                                <option key={userId} value={userId}>{username}</option>
                            ))}
                        </select>
                    </div>
                    {/* Filtro de Ações Comentado (como no original) */}
                </div>
                <div className="d-flex justify-content-end">
                    <div className="position-relative d-flex align-items-center search-bar-container">
                        <div className="search-icon"><FontAwesomeIcon icon={faSearch} className="text-gray-400" /></div>
                        <input type="text" className="form-control form-control-sm" id="searchInput" placeholder="Pesquisar..." value={searchTerm} onChange={handleSearch} />
                    </div>
                </div>
            </div>

            <div className="table-container">
                <div className="table-responsive w-100">
                    <table className="table table-borderless table-hover bg-white shadow-sm w-100" aria-label="Histórico de Operações">
                        <thead className="bg-light">
                            <tr>
                                <th style={cellStyle} onClick={() => handleSort('username')} className="cursor-pointer text-secondary" aria-sort={sortBy === 'username' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                                    Utilizador <FontAwesomeIcon icon={sortBy === 'username' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" />
                                </th>
                                <th style={cellStyle} onClick={() => handleSort('userAction')} className="cursor-pointer text-secondary" aria-sort={sortBy === 'userAction' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                                    Ação <FontAwesomeIcon icon={sortBy === 'userAction' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" />
                                </th>
                                <th style={cellStyle} onClick={() => handleSort('createdAt')} className="cursor-pointer text-secondary" aria-sort={sortBy === 'createdAt' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                                    Data <FontAwesomeIcon icon={sortBy === 'createdAt' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOperations.length === 0 ? (
                                <tr><td colSpan={3} className="text-center py-4 text-muted">Nenhuma operação encontrada.</td></tr>
                            ) : (
                                filteredOperations.map((operation) => (
                                    <tr key={operation.id}>
                                        <td style={cellStyle} className="text-secondary">{operation.username}</td>
                                        <td style={cellStyle} className="text-secondary">{operation.userAction}</td>
                                        <td style={cellStyle} className="text-secondary">{new Date(operation.createdAt).toLocaleString('pt-PT')}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {pageData && pageData.totalPages > 0 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                    <div>
                         <p className="text-muted mb-0">
                            A mostrar {startItem} - {endItem} de {pageData.totalElements} operações
                        </p>
                    </div>
                    <div className="d-flex align-items-center">
                        <button className="btn btn-outline-secondary btn-sm me-2" onClick={() => handlePageChange(page - 1)} disabled={pageData.first} aria-label="Página anterior">
                            <FontAwesomeIcon icon={faArrowLeft} />
                        </button>
                        <span>Página {page + 1} de {pageData.totalPages}</span>
                        <button className="btn btn-outline-secondary btn-sm ms-2" onClick={() => handlePageChange(page + 1)} disabled={pageData.last} aria-label="Próxima página">
                            <FontAwesomeIcon icon={faArrowRight} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OperationHistory;