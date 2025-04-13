import React, { useState, useEffect, ChangeEvent } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faSortUp, faSortDown, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
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
    const { data: obrigações, loading, error } = useApi<ObrigacaoFiscal[]>('atmate-gateway/tax/getTaxes');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('Todos'); // Alterado para string
    const [tiposDeFiltro, setTiposDeFiltro] = useState<string[]>(['Todos']); // Novo estado para os tipos de filtro
    const [sortBy, setSortBy] = useState<keyof ObrigacaoFiscal>('dataLimite');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
        if (obrigações) {
            const tipos = ['Todos', ...new Set(obrigações.map(o => o.tipo))]; // Extrai tipos únicos
            setTiposDeFiltro(tipos);
        }
    }, [obrigações]); // Dependência em obrigações para atualizar quando os dados mudam

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
        const searchMatch = searchRegex.test(obrigacao.tipo) ||
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
        <div className="container-fluid mt-5">
            <div className="mb-3 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center w-100">
                    <div className="me-3">
                        <select
                            className="form-select form-select-sm shadow-sm rounded-pill border-0 bg-light text-secondary w-auto"
                            id="filterType"
                            value={filterType}
                            onChange={handleFilter}
                        >
                            {tiposDeFiltro.map(tipo => (
                                <option key={tipo} value={tipo}>{tipo}</option>
                            ))}
                        </select>
                    </div>
                    <div className="input-group input-group-sm shadow-sm rounded-pill bg-light flex-grow-1">
                        <span className="input-group-text border-0 bg-light text-secondary"><FontAwesomeIcon icon={faSearch} /></span>
                        <input
                            type="text"
                            className="form-control border-0 bg-light text-secondary"
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