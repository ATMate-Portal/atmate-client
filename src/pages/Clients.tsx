import React, { useState, useEffect, ChangeEvent } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons';
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
  const [genderFilter, setGenderFilter] = useState<string>('Todos');
  const [sortBy, setSortBy] = useState<keyof Client>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleFilter = (event: ChangeEvent<HTMLSelectElement>) => {
    setGenderFilter(event.target.value);
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
    const searchRegex = new RegExp(searchTerm, 'i');
    const genderMatch = genderFilter === 'Todos' || client.gender === genderFilter;
    const searchMatch = searchRegex.test(client.name) || searchRegex.test(client.nif.toString()) || searchRegex.test(client.nationality);
    return genderMatch && searchMatch;
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

  return (
    <div className="container-fluid mt-5">
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center w-100 gap-3">
          <select
            className="form-select form-select-sm shadow-sm rounded-pill border-0 bg-light text-secondary w-auto"
            value={genderFilter}
            onChange={handleFilter}
          >
            <option value="Todos">Todos os géneros</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>

          <div className="input-group input-group-sm shadow-sm rounded-pill bg-light flex-grow-1">
            <span className="input-group-text border-0 bg-light text-secondary">
              <FontAwesomeIcon icon={faSearch} />
            </span>
            <input
              type="text"
              className="form-control border-0 bg-light text-secondary"
              placeholder="Pesquisar por nome, NIF ou nacionalidade..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover table-borderless bg-white shadow-sm">
          <thead className="bg-light">
            <tr>
              <th onClick={() => handleSort('name')} className="cursor-pointer text-secondary">
                Nome <FontAwesomeIcon icon={sortBy === 'name' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" />
              </th>
              <th onClick={() => handleSort('nif')} className="cursor-pointer text-secondary">
                NIF <FontAwesomeIcon icon={sortBy === 'nif' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" />
              </th>
              <th className="text-secondary">Colaborador</th>
              <th onClick={() => handleSort('gender')} className="cursor-pointer text-secondary">
                Género <FontAwesomeIcon icon={sortBy === 'gender' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" />
              </th>
              <th className="text-secondary">Nacionalidade</th>
              <th onClick={() => handleSort('birthDate')} className="cursor-pointer text-secondary">
                Nascimento <FontAwesomeIcon icon={sortBy === 'birthDate' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" />
              </th>
              <th className="text-secondary">Último Refresh</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center">A carregar...</td></tr>
            ) : error ? (
              <tr><td colSpan={7} className="text-center text-danger">Erro ao carregar clientes.</td></tr>
            ) : sortedClients.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-muted">Nenhum cliente encontrado.</td></tr>
            ) : (
              sortedClients.map((client) => (
                <tr key={client.id}>
                  <td>{client.name}</td>
                  <td>{client.nif}</td>
                  <td>{client.associatedColaborator}</td>
                  <td>{client.gender}</td>
                  <td>{client.nationality}</td>
                  <td>{client.birthDate}</td>
                  <td>{client.lastRefreshDate}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Clients;
