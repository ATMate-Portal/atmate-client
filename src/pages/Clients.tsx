import React, { useState, useEffect, ChangeEvent } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faSortUp, faSortDown, faSyncAlt, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import './Taxes.css';
import useApi from '../hooks/useApi';

interface Client {
  id: number;
  name: string;
  nif: number;
  gender: string;
  nationality: string;
  associatedColaborator: string;
  birthDate: string;
  lastRefreshDate: string;
}

const Clients = () => {
  const { data: clients, loading, error } = useApi<Client[]>('atmate-gateway/clients/getClients');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<keyof Client>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    if (clients && clients.length > 0) {
      const now = new Date();
      setLastUpdated(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
    }
  }, [clients]);

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleSort = (column: keyof Client) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const filteredClients = (clients || []).filter((client) => {
    const normalize = (str: string) =>
      str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  
    const normalizedSearch = normalize(searchTerm);
  
    return (
      normalize(client.name).includes(normalizedSearch) ||
      normalize(client.nif.toString()).includes(normalizedSearch) ||
      normalize(client.nationality).includes(normalizedSearch)
    );
  });
  

  const sortedClients = [...filteredClients].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === 'nif') {
      comparison = a.nif - b.nif;
    } else if (sortBy === 'gender') {
      comparison = a.gender.localeCompare(b.gender);
    } else if (sortBy === 'birthDate') {
      comparison = new Date(a.birthDate).getTime() - new Date(b.birthDate).getTime();
    }
    return sortDirection === 'asc' ? comparison : comparison * -1;
  });

  const cellStyle = {
    verticalAlign: 'middle',
  };

  return (
    <div className="container-fluid mt-5 animate-fade-in">
      <div className="d-flex align-items-center mb-3">
        {lastUpdated ? (
          <p className="text-muted mr-3">
            <FontAwesomeIcon icon={faSyncAlt} className="mr-2" />
            Última atualização: {lastUpdated}
          </p>
        ) : (
          <p className="text-muted mr-3">Aguardando dados...</p>
        )}
      </div>

      <div className="mb-4 d-flex gap-2">
        <input
          type="text"
          className="form-control form-control-sm rounded-md border-gray-300 pl-10 text-gray-700 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Pesquisar por nome, NIF ou nacionalidade..."
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>

      <div className="table-container">
        <div className="table-responsive w-100">
          <table className="table table-borderless table-hover bg-white shadow-sm w-100">
            <thead className="bg-light">
              <tr>
                <th style={cellStyle} onClick={() => handleSort('name')} className="cursor-pointer text-secondary">
                  Nome <FontAwesomeIcon icon={sortBy === 'name' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" />
                </th>
                <th style={cellStyle} onClick={() => handleSort('nif')} className="cursor-pointer text-secondary">
                  NIF <FontAwesomeIcon icon={sortBy === 'nif' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" />
                </th>
                <th style={cellStyle} className="text-secondary">Colaborador</th>
                <th style={cellStyle} onClick={() => handleSort('gender')} className="cursor-pointer text-secondary">
                  Género <FontAwesomeIcon icon={sortBy === 'gender' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" />
                </th>
                <th style={cellStyle} className="text-secondary">Nacionalidade</th>
                <th style={cellStyle} onClick={() => handleSort('birthDate')} className="cursor-pointer text-secondary">
                  Nascimento <FontAwesomeIcon icon={sortBy === 'birthDate' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" />
                </th>
                <th style={cellStyle} className="text-secondary">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-4 text-muted">A carregar...</td></tr>
              ) : error ? (
                <tr><td colSpan={7} className="text-center py-4 text-danger">Erro ao carregar clientes.</td></tr>
              ) : sortedClients.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-4 text-muted">Nenhum cliente encontrado.</td></tr>
              ) : (
                sortedClients.map((client) => (
                  <tr key={client.id}>
                    <td style={cellStyle} className="text-secondary">{client.name}</td>
                    <td style={cellStyle} className="text-secondary">{client.nif}</td>
                    <td style={cellStyle} className="text-secondary">{client.associatedColaborator}</td>
                    <td style={cellStyle} className="text-secondary">{client.gender}</td>
                    <td style={cellStyle} className="text-secondary">{client.nationality}</td>
                    <td style={cellStyle} className="text-secondary">{client.birthDate}</td>
                    <td style={cellStyle} className="text-secondary">
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

export default Clients;