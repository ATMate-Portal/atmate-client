import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faSortUp, faSortDown, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import './Taxes.css'; // Certifique-se de que este ficheiro ainda contém os estilos desejados

const Taxes = () => {
  const [obrigações, setObrigações] = useState([
    { id: 1, tipo: 'IVA', periodo: 'Trimestre 3 2025', dataLimite: '2025-11-20', valor: '1.850,99 €', estado: 'Pendente' },
    { id: 2, tipo: 'IRS', periodo: 'Ano 2024', dataLimite: '2026-05-31', valor: '1.320,50 €', estado: 'Em Dia' },
    { id: 3, tipo: 'IMI', periodo: '2025', dataLimite: '2025-08-31', valor: '480,25 €', estado: 'Pendente' },
    { id: 4, tipo: 'IRC', periodo: 'Ano 2024', dataLimite: '2025-07-31', valor: '7.200,00 €', estado: 'Pago' },
    { id: 5, tipo: 'Segurança Social', periodo: 'Maio 2025', dataLimite: '2025-06-15', valor: '510,70 €', estado: 'Pago' },
    { id: 6, tipo: 'IVA', periodo: 'Trimestre 1 2025', dataLimite: '2025-05-20', valor: '1.180,30 €', estado: 'Pago' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Todos');
  const [sortBy, setSortBy] = useState('dataLimite');
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleFilter = (event) => {
    setFilterType(event.target.value);
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const filteredObrigações = obrigações.filter((obrigacao) => {
    const searchRegex = new RegExp(searchTerm, 'i');
    const typeMatch = filterType === 'Todos' || obrigacao.tipo === filterType;
    const searchMatch = searchRegex.test(obrigacao.tipo) ||
                        searchRegex.test(obrigacao.periodo) ||
                        searchRegex.test(obrigacao.dataLimite) ||
                        searchRegex.test(obrigacao.valor) ||
                        searchRegex.test(obrigacao.estado);
    return typeMatch && searchMatch;
  });

  const sortedObrigações = [...filteredObrigações].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'tipo') {
      comparison = a.tipo.localeCompare(b.tipo);
    } else if (sortBy === 'periodo') {
      comparison = a.periodo.localeCompare(b.periodo);
    } else if (sortBy === 'dataLimite') {
      comparison = new Date(a.dataLimite) - new Date(b.dataLimite);
    } else if (sortBy === 'valor') {
      const valorA = parseFloat(a.valor.replace(' €', '').replace('.', '').replace(',', '.'));
      const valorB = parseFloat(b.valor.replace(' €', '').replace('.', '').replace(',', '.'));
      comparison = valorA - valorB;
    } else if (sortBy === 'estado') {
      comparison = a.estado.localeCompare(b.estado);
    }
    return sortDirection === 'asc' ? comparison : comparison * -1;
  });

  const cellStyle = {
    height: '50px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
  };

  return (
    <div className="container-fluid mt-5"> {/* Garante que ocupa a largura total */}

      <div className="mb-3 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center w-100"> {/* Ocupa a largura total do contêiner */}
          <div className="me-3">
            <select
              className="form-select form-select-sm shadow-sm rounded-pill border-0 bg-light text-secondary w-auto" // w-auto para não forçar largura
              id="filterType"
              value={filterType}
              onChange={handleFilter}
            >
              <option value="Todos">Todos os Tipos</option>
              {[...new Set(obrigações.map((o) => o.tipo))].map((tipo) => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>
          <div className="input-group input-group-sm shadow-sm rounded-pill bg-light flex-grow-1"> {/* flex-grow-1 para expandir */}
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

      <div className="table-responsive w-100"> {/* Garante que o wrapper também ocupa a largura total */}
        <table className="table table-borderless table-hover bg-white shadow-sm rounded w-100"> {/* w-100 na tabela */}
          <thead className="bg-light">
            <tr>
              <th style={cellStyle} onClick={() => handleSort('tipo')} className="cursor-pointer text-secondary">
                Tipo <FontAwesomeIcon icon={sortBy === 'tipo' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" />
              </th>
              <th style={cellStyle} onClick={() => handleSort('periodo')} className="cursor-pointer text-secondary">
                Período <FontAwesomeIcon icon={sortBy === 'periodo' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" />
              </th>
              <th style={cellStyle} onClick={() => handleSort('dataLimite')} className="cursor-pointer text-secondary">
                Data Limite <FontAwesomeIcon icon={sortBy === 'dataLimite' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" />
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
            {sortedObrigações.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-4 text-muted">Nenhuma obrigação fiscal encontrada.</td>
              </tr>
            ) : (
              sortedObrigações.map((obrigacao) => (
                <tr key={obrigacao.id}>
                  <td style={cellStyle} className="text-secondary">{obrigacao.tipo}</td>
                  <td style={cellStyle} className="text-secondary">{obrigacao.periodo}</td>
                  <td style={cellStyle} className="text-secondary">{obrigacao.dataLimite}</td>
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
  );
};

export default Taxes;