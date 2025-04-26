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
import './Taxes.css';
import useApi from '../hooks/useApi';

// Define the Operation interface to match updated API response
interface Operation {
  id: number; // Unique identifier for the operation
  userId: number; // For API filtering
  username: string; // For display
  userAction: string;
  createdAt: string;
}

// Define the Page interface for paginated response
interface Page<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  last: boolean;
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

const OperationHistory: React.FC = () => {
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [page, setPage] = useState(0);
  const [size] = useState(20); // Matches the API's default pageSize
  const [sortBy, setSortBy] = useState<keyof Operation>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUserId, setFilterUserId] = useState<string>(''); // For userId filter
  const [filterUserAction, setFilterUserAction] = useState<string>(''); // For userAction filter
  const [fromDate, setFromDate] = useState<string>(''); // For fromDate filter
  const [toDate, setToDate] = useState<string>(''); // For toDate filter
  const [estadoFilter, setEstadoFilter] = useState<string>('Todos'); // For estado filter
  const [filterType, setFilterType] = useState<string>('Todos'); // For type filter

  // Mock data for estadosDisponiveis and tiposDeObrigacao (adjust as needed)
  const estadosDisponiveis = ['Todos', 'Pendente', 'Concluído', 'Cancelado'];
  const tiposDeObrigacao = ['Todos', 'Tipo A', 'Tipo B', 'Tipo C'];

  // Construct API URL with pagination, sorting, and filter parameters
  const apiUrl = `atmate-gateway/operation-history?page=${page}&size=${size}&sort=${sortBy},${sortDirection}${
    filterUserId ? `&userId=${filterUserId}` : ''
  }${filterUserAction ? `&userAction=${encodeURIComponent(filterUserAction)}` : ''}${
    fromDate ? `&startDate=${encodeURIComponent(fromDate)}` : ''
  }${toDate ? `&endDate=${encodeURIComponent(toDate)}` : ''}${
    estadoFilter !== 'Todos' ? `&estado=${encodeURIComponent(estadoFilter)}` : ''
  }${filterType !== 'Todos' ? `&type=${encodeURIComponent(filterType)}` : ''}&refresh=${refreshTrigger}`;

  // Use the API hook with the Page type
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
    setPage(0); // Reset to first page on search
  };

  const handleSort = (column: keyof Operation) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc'); // Default to desc for new columns
    }
    setPage(0); // Reset to first page on sort change
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && pageData && newPage < pageData.totalPages) {
      setPage(newPage);
    }
  };

  const handleUserIdFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setFilterUserId(event.target.value);
    setPage(0); // Reset to first page on filter change
  };

  const handleUserActionFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setFilterUserAction(event.target.value);
    setPage(0); // Reset to first page on filter change
  };

  const handleFromDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFromDate(event.target.value);
    setPage(0); // Reset to first page on filter change
  };

  const handleToDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newToDate = event.target.value;
    if (fromDate && newToDate < fromDate) {
      alert('A data final não pode ser anterior à data inicial.');
      return;
    }
    setToDate(newToDate);
    setPage(0); // Reset to first page on filter change
  };

  const handleFilterEstado = (event: ChangeEvent<HTMLSelectElement>) => {
    setEstadoFilter(event.target.value);
    setPage(0); // Reset to first page on filter change
  };

  const handleFilterType = (event: ChangeEvent<HTMLSelectElement>) => {
    setFilterType(event.target.value);
    setPage(0); // Reset to first page on filter change
  };

  const handleClearFilters = () => {
    setFilterUserId('');
    setFilterUserAction('');
    setFromDate('');
    setToDate('');
    setEstadoFilter('Todos');
    setFilterType('Todos');
    setSearchTerm('');
    setPage(0);
  };

  // Extract unique userIds and userActions for filter dropdowns
  const uniqueUserIdsWithUsernames = Array.from(
    new Map(pageData?.content.map((op) => [op.userId, op.username])).entries()
  ).sort((a, b) => a[0] - b[0]); // [userId, username] pairs

  const uniqueUserActions = Array.from(new Set(pageData?.content.map((op) => op.userAction))).sort();

  // Filter operations client-side (temporary, ideally moved to backend)
  const filteredOperations = (pageData?.content || []).filter((operation) => {
    const searchRegex = new RegExp(searchTerm, 'i');
    const matchesSearch =
      searchRegex.test(operation.username) ||
      searchRegex.test(operation.userAction) ||
      searchRegex.test(operation.createdAt);

    const matchesUserId = filterUserId ? operation.userId.toString() === filterUserId : true;
    const matchesUserAction = filterUserAction ? operation.userAction === filterUserAction : true;

    return matchesSearch && matchesUserId && matchesUserAction;
  });

  const cellStyle = {
    verticalAlign: 'middle',
  };

  if (loading) {
    return <div className="container mt-5 text-center">A carregar histórico de operações...</div>;
  }

  if (error) {
    return <div className="container mt-5 text-center">Erro ao obter o histórico de operações: {error}</div>;
  }

  return (
    <div id="operation-history-page" className="container-fluid mt-5 animate-fade-in">
      <div className="d-flex justify-content-between align-items-center" onClick={handleRefresh}>
        {lastUpdated && (
          <p className="text-muted mr-3">
            <FontAwesomeIcon
              icon={faSyncAlt}
              className="mr-2 me-2"
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
              <label htmlFor="fromDate" className="form-label m-0 text-secondary small">
                De:
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={fromDate}
                onChange={handleFromDateChange}
                id="fromDate"
                aria-label="Filtrar por data inicial"
              />
            </div>
            <div className="d-flex gap-2 align-items-center">
              <label htmlFor="toDate" className="form-label m-0 text-secondary small">
                Até:
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={toDate}
                onChange={handleToDateChange}
                id="toDate"
                aria-label="Filtrar por data final"
              />
            </div>
          
          <div>
            <select
              id="userIdFilter"
              className="form-select form-select-sm"
              value={filterUserId}
              onChange={handleUserIdFilterChange}
              aria-label="Filtrar por utilizador"
            >
              <option value="">Utilizadores</option>
              {uniqueUserIdsWithUsernames.map(([userId, username]) => (
                <option key={userId} value={userId}>
                  {username}
                </option>
              ))}
            </select>
          </div>
          {/*<div>
            <select
              id="userActionFilter"
              className="form-select form-select-sm"
              value={filterUserAction}
              onChange={handleUserActionFilterChange}
              aria-label="Filtrar por ação"
            >
              <option value="">Ações</option>
                <option key="consultaClientes" value="consultaClientes">
                  Consulta de Clientes
                </option>
                <option key="consultaClientes" value="consultaClientes">
                  Consulta de Obrigações fiscais
                </option>
                <option key="consultaClientes" value="consultaClientes">
                  Consulta de Obrigações fiscais urgentes
                </option>
                <option key="consultaClientes" value="consultaClientes">
                  Consulta de Clientes
                </option>
                <option key="consultaClientes" value="consultaClientes">
                  Consulta de Parametrização de Prazos
                </option>
            </select>
          </div>*/}
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
          <table
            className="table table-borderless table-hover bg-white shadow-sm w-100"
            aria-label="Histórico de Operações"
          >
            <thead className="bg-light">
              <tr>
                <th
                  style={cellStyle}
                  onClick={() => handleSort('username')}
                  className="cursor-pointer text-secondary"
                  aria-sort={sortBy === 'username' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Utilizador{' '}
                  <FontAwesomeIcon
                    icon={sortBy === 'username' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown}
                    size="sm"
                  />
                </th>
                <th
                  style={cellStyle}
                  onClick={() => handleSort('userAction')}
                  className="cursor-pointer text-secondary"
                  aria-sort={sortBy === 'userAction' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Ação{' '}
                  <FontAwesomeIcon
                    icon={sortBy === 'userAction' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown}
                    size="sm"
                  />
                </th>
                <th
                  style={cellStyle}
                  onClick={() => handleSort('createdAt')}
                  className="cursor-pointer text-secondary"
                  aria-sort={sortBy === 'createdAt' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Data{' '}
                  <FontAwesomeIcon
                    icon={sortBy === 'createdAt' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown}
                    size="sm"
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOperations.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-4 text-muted">
                    Nenhuma operação encontrada.
                  </td>
                </tr>
              ) : (
                filteredOperations.map((operation) => (
                  <tr key={operation.id}>
                    <td style={cellStyle} className="text-secondary">
                      {operation.username}
                    </td>
                    <td style={cellStyle} className="text-secondary">
                      {operation.userAction}
                    </td>
                    <td style={cellStyle} className="text-secondary">
                      {new Date(operation.createdAt).toLocaleString()}
                    </td>
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
              Mostrando {filteredOperations.length} de {pageData.totalElements} operações
            </p>
          </div>
          <div className="d-flex align-items-center">
            <button
              className="btn btn-outline-secondary btn-sm me-2"
              onClick={() => handlePageChange(page - 1)}
              disabled={pageData.first}
              aria-label="Página anterior"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>
            <span>
              Página {page + 1} de {pageData.totalPages}
            </span>
            <button
              className="btn btn-outline-secondary btn-sm ms-2"
              onClick={() => handlePageChange(page + 1)}
              disabled={pageData.last}
              aria-label="Próxima página"
            >
              <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationHistory;