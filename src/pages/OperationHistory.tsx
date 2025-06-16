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

import DatePicker, { registerLocale, setDefaultLocale } from 'react-datepicker';
import { pt } from 'date-fns/locale'; 
import 'react-datepicker/dist/react-datepicker.css'; 

import './Taxes.css'; 
import useApi from '../hooks/useApi';

// Configura o 'react-datepicker' para usar a localização portuguesa por defeito.
registerLocale('pt', pt);
setDefaultLocale('pt');

// --- INTERFACES DE DADOS ---
/**
 * @interface Operation
 * Define a estrutura de um único registo no histórico de operações.
 */
interface Operation {
    id: number;
    userId: number;
    username: string;
    userAction: string;
    createdAt: string;
}

/**
 * @interface UniqueUser
 * Define a estrutura para os dados de um utilizador único, usada para popular o filtro (select menu de user).
 */
interface UniqueUser {
    userId: number;
    username: string;
}

/**
 * @interface Page
 * Define a estrutura do objeto de paginação retornado pela API.
 */
interface Page<T> {
    content: T[];
    last: boolean;
    totalPages: number;
    totalElements: number;
    size: number;
    number: number; // O número da página atual (0-indexed).
    first: boolean;
    numberOfElements: number;
    empty: boolean;
    // As propriedades 'pageable' e 'sort' foram simplificadas, mas podem ser tipadas com mais detalhe.
    pageable: any;
    sort: any;
}


/**
 * @function formatDateForApi
 * Formata um objeto Date para uma string no formato "YYYY-MM-DD",
 * que é o formato esperado pela API nos parâmetros de data.
 */
const formatDateForApi = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`; // Formato YYYY-MM-DD
};


/**
 * @component OperationHistory
 * Página que exibe uma tabela paginada e filtrável do histórico de operações da aplicação.
 */
const OperationHistory: React.FC = () => {
    // --- ESTADOS DO COMPONENTE (useState) ---
    // Estados para controlo da UI, como a data da última atualização e o estado de refresh.
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Estados para a paginação e ordenação da tabela.
    const [page, setPage] = useState(0);
    const [size] = useState(20);
    const [sortBy, setSortBy] = useState<keyof Operation>('createdAt');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Estados para os valores dos filtros.
    const [searchTerm, setSearchTerm] = useState('');
    const [filterUserId, setFilterUserId] = useState<string>('');
    const [filterUserAction, setFilterUserAction] = useState<string>('');
    const [fromDate, setFromDate] = useState<Date | null>(null);
    const [toDate, setToDate] = useState<Date | null>(null);

    // Estado para guardar a lista de utilizadores para o dropdown, obtida de uma chamada à API separada.
    const [uniqueUsersForFilter, setUniqueUsersForFilter] = useState<UniqueUser[]>([]);

     // --- CHAMADAS À API (usando o hook useApi) ---

    // 1. Chamada para obter a lista de utilizadores únicos.
    const uniqueUsersApiUrl = `atmate-gateway/operation-history/unique-users`;
    
    // Este hook executa a chamada sempre que a URL (e, portanto, as datas) muda
    const { data: uniqueUsersData, loading: usersLoading } = useApi<UniqueUser[]>(uniqueUsersApiUrl);

    const [estadoFilter, setEstadoFilter] = useState<string>('Todos'); 
    const [filterType, setFilterType] = useState<string>('Todos');

     // 2. Chamada principal para obter os dados da tabela (histórico de operações).
    // Esta URL é reativa a todas as mudanças de filtros, paginação e ordenação.
    const apiUrl = `atmate-gateway/operation-history?page=${page}&size=${size}&sort=${sortBy},${sortDirection}${
        filterUserId ? `&userId=${filterUserId}` : ''
    }${filterUserAction ? `&userAction=${encodeURIComponent(filterUserAction)}` : ''}${
        fromDate ? `&startDate=${encodeURIComponent(formatDateForApi(fromDate))}` : ''
    }${toDate ? `&endDate=${encodeURIComponent(formatDateForApi(toDate))}` : ''}${
        estadoFilter !== 'Todos' ? `&estado=${encodeURIComponent(estadoFilter)}` : ''
    }${filterType !== 'Todos' ? `&type=${encodeURIComponent(filterType)}` : ''}&refresh=${refreshTrigger}`;

    const { data: pageData, loading, error } = useApi<Page<Operation>>(apiUrl);

    //Executado sempre que os dados dos utilizadores únicos ('uniqueUsersData') mudam.
    useEffect(() => {
        if (uniqueUsersData) {
            setUniqueUsersForFilter(uniqueUsersData);
        }
    }, [uniqueUsersData]);

    //executado sempre que os dados da tabela ('pageData') mudam.
    useEffect(() => {
        if (pageData && pageData.content.length > 0) {
            const now = new Date();
            setLastUpdated(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
        }
        setIsRefreshing(false);
    }, [pageData]);

    // --- HANDLERS ---
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

    // --- LÓGICA DE DADOS E RENDERIZAÇÃO ---
    // A pesquisa por texto (`searchTerm`) é feita no lado do cliente sobre os dados da página atual.
    const filteredOperations = (pageData?.content || []).filter((operation) => {
        const searchRegex = new RegExp(searchTerm, 'i');
        return (
            searchRegex.test(operation.username) ||
            searchRegex.test(operation.userAction) ||
            searchRegex.test(operation.createdAt)
        );
    });

    // Calcula os itens de início e fim para a mensagem de paginação (ex: "A mostrar 1 - 20 de 100").
    const startItem = pageData ? (pageData.number * pageData.size) + 1 : 0;
    const endItem = pageData ? startItem + pageData.numberOfElements - 1 : 0;

    const cellStyle = { verticalAlign: 'middle' };

    // Renderização condicional para os estados de carregamento e erro.
    if (loading) return <div className="container mt-5 text-center">A carregar histórico de operações...</div>;
    if (error) return <div className="container mt-5 text-center alert alert-danger">Erro ao obter o histórico de operações: {error.toString()}</div>;

    return (
        <div id="operation-history-page" className="container-fluid mt-5 animate-fade-in">
            {/* Cabeçalho com o botão de atualização. */}
            <div className="d-flex justify-content-between align-items-center" >
                {lastUpdated && (
                    <p className="text-muted mr-3" onClick={handleRefresh}>
                        <FontAwesomeIcon icon={faSyncAlt} className="mr-2 me-2" style={{ cursor: 'pointer' }} spin={isRefreshing} />
                        Última atualização: {lastUpdated}
                    </p>
                )}
                {!lastUpdated && <p className="text-muted mr-3">Aguardando dados...</p>}
            </div>

            {/* Painel de filtros. */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex gap-2 align-items-center flex-wrap">
                    {/* Filtros de data */}
                    <div className="d-flex gap-2 align-items-center">
                        <label htmlFor="fromDate" className="form-label m-0 text-secondary small">De:</label>
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
                    </div>
                    <div className="d-flex gap-2 align-items-center">
                        <label htmlFor="toDate" className="form-label m-0 text-secondary small">Até:</label>
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
                    </div>

                    <div>
                        {/* Filtro de utilizador, populado dinamicamente. */}
                        <select 
                            id="userIdFilter" 
                            className="form-select form-select-sm" 
                            value={filterUserId} 
                            onChange={e => { setFilterUserId(e.target.value); setPage(0); }}
                            aria-label="Filtrar por utilizador"
                            disabled={usersLoading} // Desativa enquanto carrega a lista de utilizadores
                        >
                            <option value="">{usersLoading ? "A carregar..." : "Utilizadores"}</option>
                            {uniqueUsersForFilter.map(user => (
                                <option key={user.userId} value={user.userId}>{user.username}</option>
                            ))}
                        </select>
                    </div>
                    {/* Barra de pesquisa. */}
                </div>
                <div className="d-flex justify-content-end">
                    <div className="position-relative d-flex align-items-center search-bar-container">
                        <div className="search-icon"><FontAwesomeIcon icon={faSearch} className="text-gray-400" /></div>
                        <input type="text" className="form-control form-control-sm" id="searchInput" placeholder="Pesquisar..." value={searchTerm} onChange={handleSearch} />
                    </div>
                </div>
            </div>

            {/* Tabela de dados. */}
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

            {/* Controlos de paginação. */}
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