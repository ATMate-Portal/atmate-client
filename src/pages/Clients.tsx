import React, { useState, useEffect, ChangeEvent, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faSortUp, faSortDown, faSyncAlt, faInfoCircle, faUser, faLock, faExclamationCircle, faCheckCircle, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import './Taxes.css';
import useApi from '../hooks/useApi';
import axios from 'axios';

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

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sortBy, setSortBy] = useState<keyof Client>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [nif, setNif] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Novos estados para o modal de confirmação
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientIdToDelete, setClientIdToDelete] = useState<number | null>(null);

  const nifMaxLength = 9;

  const apiUrl = `atmate-gateway/clients/getClients?refresh=${refreshTrigger}`;
  const { data: clients, loading, error: fetchError } = useApi<Client[]>(apiUrl);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
  }, [setIsRefreshing, setRefreshTrigger]);

  useEffect(() => {
    if (clients && clients.length > 0) {
      const now = new Date();
      setLastUpdated(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
    }
    setIsRefreshing(false);
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

  const handleNifChange = (event: ChangeEvent<HTMLInputElement>) => {
    const onlyDigits = event.target.value.replace(/\D/g, '');
    if (onlyDigits.length <= nifMaxLength) {
      setNif(onlyDigits);
    }
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  const handleConfirmPasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(event.target.value);
  };

  const handleAddClient = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage('');

    try {
      const apiUrl = `${BASE_URL}atmate-gateway/clients/create`;
      const clientData = { nif, password };

      if (password.length === 0) {
        setError('A palavra-passe não pode ser vazia!');
        setIsLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('As palavras-passe não coincidem!');
        setIsLoading(false);
        return;
      }

      if (nif.length !== 9) {
        setError('NIF tem que ter exatamente 9 dígitos!');
        setIsLoading(false);
        return;
      }

      const response = await axios.post(apiUrl, clientData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setIsLoading(false);
      setDeleteSuccessMessage('Cliente adicionado com sucesso!');
      setNif('');
      setPassword('');
      setConfirmPassword('');
      setShowModal(false);
      handleRefresh();
      console.log('Cliente adicionado:', response.data);
    } catch (err: any) {
      setIsLoading(false);
      setError('Ocorreu um erro ao comunicar com o servidor: ' + err.message);
    }
  };

  const handleDeleteClient = async () => {
    if (!clientIdToDelete) return;

    try {
      const apiUrl = `${BASE_URL}atmate-gateway/clients/${clientIdToDelete}`;
      await axios.delete(apiUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setDeleteSuccessMessage('Cliente eliminado com sucesso!');
      setDeleteError(null);
      setShowDeleteModal(false);
      setClientIdToDelete(null);
      handleRefresh();
    } catch (err: any) {
      setDeleteError('Erro ao eliminar o cliente: ' + err.message);
      setDeleteSuccessMessage('');
      setShowDeleteModal(false);
      setClientIdToDelete(null);
    }
  };

  const handleOpenDeleteModal = (clientId: number) => {
    setClientIdToDelete(clientId);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setClientIdToDelete(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNif('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccessMessage('');
  };

  const cellStyle = {
    verticalAlign: 'middle',
  };

  return (
    <div className="container-fluid mt-5 animate-fade-in">
      <div className="header-row mb-3">
        <div className="left-column" onClick={handleRefresh}>
          {lastUpdated ? (
            <p className="text-muted mb-0">
              <FontAwesomeIcon
                icon={faSyncAlt}
                className="mr-2 me-2"
                style={{ cursor: 'pointer' }}
                spin={isRefreshing}
              />
              Última atualização: {lastUpdated}
            </p>
          ) : (
            <p className="text-muted mb-0">Aguardando dados...</p>
          )}
        </div>

        <div className="right-column">
          <button
            type="button"
            className="btn btn-primary shadow"
            onClick={() => setShowModal(true)}
          >
            Adicionar cliente
          </button>
        </div>
      </div>

      {deleteSuccessMessage && (
        <div className="alert alert-success d-flex align-items-center mb-3">
          <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
          {deleteSuccessMessage}
        </div>
      )}

      {deleteError && (
        <div className="alert alert-danger d-flex align-items-center mb-3">
          <FontAwesomeIcon icon={faExclamationCircle} className="me-2" />
          {deleteError}
        </div>
      )}

      {/* Modal estilizado para adicionar cliente */}
      <div className={`modal fade ${showModal ? 'show d-block' : ''}`} tabIndex={-1} style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
        <div className="modal-dialog modal-dialog-centered custom-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title modal-title-colored">Adicionar Novo Cliente</h5>
              <button
                type="button"
                className="btn-close"
                onClick={handleCloseModal}
              ></button>
            </div>
            <div className="modal-body">
              <div className="mb-3 position-relative">
                <label htmlFor="nif" className="form-label">NIF</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <FontAwesomeIcon icon={faUser} className="input-icon" />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    id="nif"
                    value={nif}
                    onChange={handleNifChange}
                  />
                </div>
              </div>
              <div className="mb-3 position-relative">
                <label htmlFor="password" className="form-label">Palavra-passe</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <FontAwesomeIcon icon={faLock} className="input-icon" />
                  </span>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    value={password}
                    onChange={handlePasswordChange}
                  />
                </div>
              </div>
              <div className="mb-3 position-relative">
                <label htmlFor="confirmPassword" className="form-label">Confirmar palavra-passe</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <FontAwesomeIcon icon={faLock} className="input-icon" />
                  </span>
                  <input
                    type="password"
                    className="form-control"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                  />
                </div>
              </div>
              {error && (
                <div className="alert alert-danger d-flex align-items-center mt-3">
                  <FontAwesomeIcon icon={faExclamationCircle} className="me-2" />
                  {error}
                </div>
              )}
              {successMessage && (
                <div className="alert alert-success d-flex align-items-center mt-3">
                  <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                  {successMessage}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary custom-btn-add"
                onClick={handleAddClient}
                disabled={isLoading}
              >
                {isLoading ? 'A adicionar...' : 'Adicionar cliente'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmação de eliminação */}
      <div className={`modal fade ${showDeleteModal ? 'show d-block' : ''}`} tabIndex={-1} style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
        <div className="modal-dialog modal-dialog-centered custom-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title modal-title-colored">Confirmar Eliminação</h5>
              <button
                type="button"
                className="btn-close"
                onClick={handleCloseDeleteModal}
              ></button>
            </div>
            <div className="modal-body">
              <p>Tem certeza que deseja eliminar este cliente? Esta ação não pode ser desfeita.</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseDeleteModal}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteClient}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
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
              ) : fetchError ? (
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
                      <div className="action-buttons">
                        <button className="btn btn-sm btn-outline-secondary rounded-pill shadow-sm me-2">
                          <FontAwesomeIcon icon={faInfoCircle} className="me-1" /> Ver Detalhes
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger rounded-pill shadow-sm"
                          onClick={() => handleOpenDeleteModal(client.id)}
                        >
                          <FontAwesomeIcon icon={faTrashAlt} className="me-1" /> Eliminar
                        </button>
                      </div>
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