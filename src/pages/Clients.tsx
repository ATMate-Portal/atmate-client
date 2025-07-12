import React, { useState, useEffect, ChangeEvent, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSortUp, faSortDown, faSyncAlt, faInfoCircle, faUser, faLock, faExclamationCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons'; // Removido faTrashAlt
import './Taxes.css';
import useApi from '../hooks/useApi';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

/**
 * @interface Client
 * Define a estrutura de dados para um único cliente.
 */
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

/**
 * @component Clients
 * Página responsável por exibir, pesquisar, ordenar e adicionar clientes.
 * Obtém a lista de clientes da API e gere a interatividade da tabela e de um modal para adicionar novos clientes.
 */
const Clients = () => {
  // --- ESTADOS DO COMPONENTE (useState) ---
    // Estados para a UI da tabela (pesquisa, ordenação, atualização).
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sortBy, setSortBy] = useState<keyof Client>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Estados para o modal de adicionar cliente.
  const [showModal, setShowModal] = useState(false);
  const [nif, setNif] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Erros do formulário do modal.
  const [successMessage, setSuccessMessage] = useState(''); 

  const nifMaxLength = 9;

  // --- OBTER DADOS ---
  // Utiliza o hook 'useApi' para obter a lista de todos os clientes.
  const apiUrl = `atmate-gateway/clients/getClients?refresh=${refreshTrigger}`;
  const { data: clients, loading, error: fetchError } = useApi<Client[]>(apiUrl);

  // Atualizar a data da "Última atualização" quando os dados dos clientes são carregados.
  useEffect(() => {
    if (clients && clients.length > 0) {
      const now = new Date();
      setLastUpdated(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
    }
    setIsRefreshing(false);
  }, [clients]);

    const navigate = useNavigate();

  // --- HANDLERS ---
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
  }, [setIsRefreshing, setRefreshTrigger]);

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Lógica para alternar a ordenação da coluna clicada.
  const handleSort = (column: keyof Client) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  // Controla as alterações nos inputs do formulário do modal.
  const handleNifChange = (event: ChangeEvent<HTMLInputElement>) => {
    const onlyDigits = event.target.value.replace(/\D/g, '');
    if (onlyDigits.length <= nifMaxLength) {
      setNif(onlyDigits);
    }
  };

  // Navega para a página de detalhes do cliente quando uma linha é clicada.
  const handleClientClick = (clientId: number) => {
    navigate(`/clients/${clientId}`);
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  const handleConfirmPasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(event.target.value);
  };

  /**
     * @function handleAddClient
     * Valida os dados do formulário e envia um request POST para criar um novo cliente.
     */
  const handleAddClient = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(''); // Limpa mensagens de sucesso anteriores

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

      const token = localStorage.getItem('authToken');
      const response = await axios.post(apiUrl, clientData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      setIsLoading(false);
      setSuccessMessage('Cliente adicionado com sucesso!'); // Usar successMessage para feedback de adição
      setNif('');
      setPassword('');
      setConfirmPassword('');
      setShowModal(false);
      handleRefresh();
      console.log('Cliente adicionado:', response.data);
    } catch (err: any) {
      setIsLoading(false);
      setError('Ocorreu um erro ao comunicar com o servidor: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNif('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccessMessage(''); // Limpa mensagem de sucesso ao fechar o modal
  };

  // --- LÓGICA DE FILTRAGEM E ORDENAÇÃO (CLIENT-SIDE) ---
  // 1. Filtra a lista de clientes com base no termo de pesquisa.
  const filteredClients = (clients || []).filter((client) => {
    const normalize = (str: string | undefined | null) =>
      str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';

    const normalizedSearch = normalize(searchTerm);

    return (
      normalize(client.name).includes(normalizedSearch) ||
      normalize(client.nif.toString()).includes(normalizedSearch) ||
      normalize(client.nationality).includes(normalizedSearch) ||
      normalize(client.associatedColaborator).includes(normalizedSearch)
    );
  });

  // 2. Ordena a lista já filtrada.
  const sortedClients = [...filteredClients].sort((a, b) => {
    let comparison = 0;
    const valA = a[sortBy];
    const valB = b[sortBy];

    if (sortBy === 'name' || sortBy === 'gender' || sortBy === 'associatedColaborator') {
        comparison = String(valA).localeCompare(String(valB));
    } else if (sortBy === 'nif') {
        comparison = Number(valA) - Number(valB);
    } else if (sortBy === 'birthDate') {
        const dateA = new Date(String(valA)).getTime();
        const dateB = new Date(String(valB)).getTime();
        comparison = (isNaN(dateA) ? 0 : dateA) - (isNaN(dateB) ? 0 : dateB);
    }
    return sortDirection === 'asc' ? comparison : comparison * -1;
  });

  const cellStyle = {
    verticalAlign: 'middle',
  };

  // --- RENDERIZAÇÃO DO COMPONENTE ---
  return (
    <div className="container-fluid mt-5 animate-fade-in">
      {/* Cabeçalho da página com botão de atualizar e de adicionar cliente. */}
      <div className="header-row mb-3">
        <div className="left-column" onClick={handleRefresh} style={{ cursor: 'pointer' }}>
          {lastUpdated ? (
            <p className="text-muted mb-0">
              <FontAwesomeIcon
                icon={faSyncAlt}
                className="mr-2 me-2"
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

      {/* Alerta de sucesso, exibido fora do modal após a criação de um cliente. */}
      {successMessage && !showModal && (
        <div className="alert alert-success d-flex align-items-center mb-3 alert-dismissible fade show" role="alert">
          <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
          {successMessage}
          <button type="button" className="btn-close" onClick={() => setSuccessMessage('')} aria-label="Close"></button>
        </div>
      )}

      {/* Modal para adicionar um novo cliente. */}
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
         
      {/* Barra de pesquisa para a tabela. */}           
      <div className="mb-4 d-flex gap-2">
        <input
          type="text"
          className="form-control form-control-sm rounded-md border-gray-300 pl-10 text-gray-700 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Pesquisar por nome, NIF, nacionalidade ou colaborador..."
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>

      {/* Tabela de clientes. */}
      <div className="table-container">
        <div className="table-responsive w-100">
          <table className="table table-borderless table-hover bg-white shadow-sm w-100">
            <thead className="bg-light">
              {/* Cabeçalhos da tabela clicáveis para ordenação. */}
              <tr>
                <th style={cellStyle} onClick={() => handleSort('name')} className="cursor-pointer text-secondary">
                  Nome <FontAwesomeIcon icon={sortBy === 'name' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" />
                </th>
                <th style={cellStyle} onClick={() => handleSort('nif')} className="cursor-pointer text-secondary">
                  NIF <FontAwesomeIcon icon={sortBy === 'nif' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" />
                </th>
                <th style={cellStyle} onClick={() => handleSort('associatedColaborator')} className="cursor-pointer text-secondary">
                  Colaborador <FontAwesomeIcon icon={sortBy === 'associatedColaborator' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" />
                </th>
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
              {/* Renderização condicional do corpo da tabela. */}
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
                    <td style={cellStyle} className="text-secondary">{client.associatedColaborator || 'N/A'}</td>
                    <td style={cellStyle} className="text-secondary">{client.gender}</td>
                    <td style={cellStyle} className="text-secondary">{client.nationality}</td>
                    <td style={cellStyle} className="text-secondary">{client.birthDate}</td>
                    <td style={cellStyle} className="text-secondary">
                      <div className="action-buttons">
                        <button className="btn btn-sm btn-outline-primary rounded-pill shadow-sm"
                          onClick={() => handleClientClick(client.id)}>
                          <FontAwesomeIcon icon={faInfoCircle} className="me-1" /> Ver Detalhes
                        </button>
                        {/* Botão de eliminar removido daqui */}
                        {/* <button ... onClick={() => handleOpenDeleteModal(client.id)} ... > Eliminar </button> */}
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