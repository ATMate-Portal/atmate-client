import React, { Fragment, useEffect, useState, useMemo, useCallback } from 'react';
import './Notifications.css'; // O CSS agora usa IDs
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave, faSpinner, faSyncAlt, faUser, faBell, faMoneyBill, faClock, faToggleOn, faToggleOff,
  faEdit, faTrashAlt, faPlusCircle, faSearch, faTimesCircle, faExclamationTriangle, faCheckCircle,
  faFilter, faRedo, faUsers, faCheckSquare, faSquare, faGlobe, faList // Ícones novos
} from '@fortawesome/free-solid-svg-icons';
import useApi from '../hooks/useApi';

// --- Interfaces ---
interface Client { id: number; name: string; nif: number; }
interface TaxType { id: number; name: string; }
// Configuração guardada - ainda precisa de is_active
interface NotificationConfig { id?: number; client_id: number | 'all'; client_name?: string; client_nif?: number; notification_type: string | 'all'; tax_type: number | 'all'; frequency: string; start_period: number; is_active: boolean; }
// Estado local do formulário - is_active só é relevante para edição
interface FormDataState { notification_type: string | 'all'; tax_type: number | 'all'; frequency: string; start_period: number; is_active: boolean; } // Mantém is_active para edição
interface SubmitResponse { success: boolean; message?: string; data?: any; }
interface GetConfigsResponse { data: NotificationConfig[]; }
interface ActionDetails { url: string; method: 'PUT' | 'DELETE'; body?: any; }

type ClientSelectionMode = 'all' | 'individual';

const API_BASE_URL = 'atmate-gateway';

// --- Componente Principal ---
const Notifications: React.FC = () => {
  // --- Estados ---
  // Estado inicial do formulário - SEM is_active explícito, assume true na criação
  const initialFormData: Omit<FormDataState, 'is_active'> & { is_active?: boolean } = {
      notification_type: '',
      tax_type: 0,
      frequency: '',
      start_period: 1,
      // is_active será adicionado dinamicamente se estiver a editar
  };
  const [formData, setFormData] = useState<FormDataState>(initialFormData as FormDataState); // Força true na criação via submit
  // Restantes estados iguais
  const [selectedClients, setSelectedClients] = useState<Client[]>([]);
  const [clientSelectionMode, setClientSelectionMode] = useState<ClientSelectionMode>('individual');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [submitTrigger, setSubmitTrigger] = useState(0);
  const [actionDetails, setActionDetails] = useState<ActionDetails | null>(null);
  const [actionTrigger, setActionTrigger] = useState(0);
  const [notificationMessage, setNotificationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // --- Constantes ---
  const frequencies: string[] = ['Daily', 'Weekly', 'Monthly', 'Quarterly'];
  const notificationTypes: string[] = ['SMS', 'EMAIL'];

  // --- API Hooks ---
  const { data: allClientsData, loading: clientsLoading, error: clientsError } = useApi<Client[]>(`${API_BASE_URL}/clients/getClients?refresh=${refreshTrigger}`, { enabled: true });
  const allClients = useMemo(() => allClientsData || [], [allClientsData]);
  const { data: taxTypesData, loading: taxTypesLoading, error: taxTypesError } = useApi<TaxType[]>(`${API_BASE_URL}/tax/getTypes?refresh=${refreshTrigger}`, { enabled: true });
  const taxTypes = useMemo(() => taxTypesData || [], [taxTypesData]);
  const { data: existingConfigsData, loading: configsLoading, error: configsError } = useApi<GetConfigsResponse>(`${API_BASE_URL}/notification/getNotificationConfig?refresh=${refreshTrigger}`, { enabled: true });
  const originalConfigs = useMemo(() => existingConfigsData?.data || [], [existingConfigsData]);
  const submitEndpoint = editingConfigId ? `${API_BASE_URL}/notifications/updateConfig/${editingConfigId}` : `${API_BASE_URL}/notifications/createConfig`;
  const submitMethod = editingConfigId ? 'PUT' : 'POST';
  // Hook de submissão adaptado para forçar is_active: true na criação
  const { data: submitResponse, loading: submitLoading, error: submitError } = useApi<SubmitResponse>(submitEndpoint, {
       method: submitMethod,
       body: {
         // Dados comuns do formulário
         notification_type: formData.notification_type,
         tax_type: formData.tax_type,
         frequency: formData.frequency,
         start_period: formData.start_period,
         // Define is_active: true na criação, usa o valor do estado na edição
         is_active: editingConfigId ? formData.is_active : true,
         // Lógica de clientes
         client_ids: clientSelectionMode === 'all' ? 'all' : selectedClients.map(c => c.id)
       },
       enabled: submitTrigger > 0,
     });
  const { loading: actionLoading, error: actionError, data: actionResponse } = useApi<SubmitResponse>(actionDetails?.url || '', { method: actionDetails?.method || 'PUT', body: actionDetails?.body, enabled: actionTrigger > 0 && !!actionDetails, });

  // --- Efeitos ---
  useEffect(() => { if (!clientsLoading && !taxTypesLoading && !configsLoading) { const now = new Date(); const dateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }; const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }; setLastUpdated(`${now.toLocaleDateString('pt-PT', dateOptions)} ${now.toLocaleTimeString('pt-PT', timeOptions)}`); setIsRefreshingData(false); } }, [clientsLoading, taxTypesLoading, configsLoading]);
  // resetFormAndState não precisa mais de is_active
  const resetFormAndState = useCallback(() => { setFormData(initialFormData as FormDataState); setSelectedClients([]); setClientSelectionMode('individual'); setEditingConfigId(null); setClientSearchTerm(''); setShowClientDropdown(false); setSubmitTrigger(0); setActionDetails(null); setActionTrigger(0); }, []);
  useEffect(() => { if (submitTrigger > 0 && submitResponse !== null) { if (submitResponse?.success) { setNotificationMessage({ type: 'success', text: submitResponse.message || `Configuração ${editingConfigId ? 'atualizada' : 'guardada'} com sucesso!` }); resetFormAndState(); setRefreshTrigger(prev => prev + 1); } else { setNotificationMessage({ type: 'error', text: submitResponse?.message || 'Ocorreu um erro ao guardar a configuração.' }); } setSubmitTrigger(0); } }, [submitResponse, submitTrigger, editingConfigId, resetFormAndState]);
  useEffect(() => { if (submitTrigger > 0 && submitError) { setNotificationMessage({ type: 'error', text: `Erro ao guardar: ${submitError}` }); setSubmitTrigger(0); } }, [submitError, submitTrigger]);
  useEffect(() => { if (actionTrigger > 0 && actionResponse !== null) { if (actionResponse?.success) { setNotificationMessage({ type: 'success', text: actionResponse.message || `Ação concluída com sucesso!` }); setRefreshTrigger(prev => prev + 1); } else { setNotificationMessage({ type: 'error', text: actionResponse?.message || `Erro ao executar a ação.` }); } setActionDetails(null); setActionTrigger(0); } }, [actionResponse, actionTrigger]);
  useEffect(() => { if (actionTrigger > 0 && actionError) { setNotificationMessage({ type: 'error', text: `Erro na API ao executar ação: ${actionError}` }); setActionDetails(null); setActionTrigger(0); } }, [actionError, actionTrigger]);
  useEffect(() => { if (notificationMessage) { const timer = setTimeout(() => { setNotificationMessage(null); }, 5000); return () => clearTimeout(timer); } }, [notificationMessage]);

  // --- Handlers ---
  // handleChange não precisa tratar is_active checkbox
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      let processedValue: string | number | 'all' = value; // Remove boolean type possibility

      if (name === 'tax_type') {
          processedValue = value === 'all' ? 'all' : (parseInt(value) || 0);
      } else if (name === 'notification_type') {
          processedValue = value === 'all' ? 'all' : value;
      } else if (name === 'start_period') {
           processedValue = parseInt(value) || 1;
      }
      // Atualiza campo, excluindo 'is_active' que não vem do form
      if (name !== 'is_active') {
          setFormData(prev => ({ ...prev, [name]: processedValue }));
      }
  }, []);

  const handleClientSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { const term = e.target.value; setClientSearchTerm(term); setShowClientDropdown(term.length > 0); }, []);
  const handleAddClient = useCallback((client: Client) => { if (!selectedClients.some(selected => selected.id === client.id)) { setSelectedClients(prev => [...prev, client]); } setClientSearchTerm(''); setShowClientDropdown(false); }, [selectedClients]);
  const handleRemoveClient = useCallback((clientId: number) => { setSelectedClients(prev => prev.filter(client => client.id !== clientId)); }, []);
  const handleClientModeChange = useCallback((mode: ClientSelectionMode) => { setClientSelectionMode(mode); if (mode === 'all') { setSelectedClients([]); setClientSearchTerm(''); setShowClientDropdown(false); } }, []);
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (clientSelectionMode === 'individual' && selectedClients.length === 0 && !editingConfigId) { setNotificationMessage({ type: 'error', text: 'Por favor, selecione pelo menos um cliente.' }); return; }
    if (!formData.notification_type || !formData.tax_type || !formData.frequency) { setNotificationMessage({ type: 'error', text: 'Por favor, preencha todos os campos obrigatórios de configuração.'}); return; }
    setSubmitTrigger(prev => prev + 1);
  }, [formData, selectedClients, clientSelectionMode, editingConfigId]);
  const handleRefresh = useCallback(() => { setIsRefreshingData(true); setRefreshTrigger((prev) => prev + 1); }, []);
  // handleEdit ainda carrega is_active para o estado formData, caso o utilizador edite outros campos
  const handleEdit = useCallback((config: NotificationConfig) => {
    setEditingConfigId(config.id!);
    setFormData({
        notification_type: config.notification_type,
        tax_type: config.tax_type,
        frequency: config.frequency,
        start_period: config.start_period,
        is_active: config.is_active, // Carrega o estado ativo/inativo atual
    });
    if (config.client_id === 'all') { setClientSelectionMode('all'); setSelectedClients([]); }
    else { const client = allClients.find(c => c.id === config.client_id); setClientSelectionMode('individual'); setSelectedClients(client ? [client] : []); }
    setClientSearchTerm(''); setShowClientDropdown(false); window.scrollTo(0, 0); setNotificationMessage(null);
  }, [allClients]);

  const handleCancelEdit = useCallback(() => { resetFormAndState(); }, [resetFormAndState]);
  const handleTableAction = useCallback((action: 'delete' | 'toggle', configId: number, currentStatus?: boolean) => { let details: ActionDetails | null = null; if (action === 'delete') { if (!window.confirm("Tem a certeza que deseja apagar esta configuração?")) return; details = { url: `${API_BASE_URL}/notifications/deleteConfig/${configId}`, method: 'DELETE' }; } else if (action === 'toggle') { details = { url: `${API_BASE_URL}/notifications/toggleConfig/${configId}`, method: 'PUT', body: { is_active: !currentStatus } }; } if (details) { setActionDetails(details); setActionTrigger(prev => prev + 1); } }, []);
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => { setFilterStatus(e.target.value as 'all' | 'active' | 'inactive'); };

  // --- Filtro de Clientes (Autocomplete - mantém-se igual) ---
  const filteredClients = useMemo(() => { if (!clientSearchTerm || clientSelectionMode === 'all') return []; const selectedIds = new Set(selectedClients.map(c => c.id)); return allClients.filter(client => !selectedIds.has(client.id) && (client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || client.nif.toString().includes(clientSearchTerm))).slice(0, 10); }, [clientSearchTerm, allClients, selectedClients, clientSelectionMode]);

  // --- Filtrar Configurações Existentes (mantém-se igual) ---
  const displayedConfigs = useMemo(() => { let configs = [...originalConfigs]; if (filterStatus !== 'all') { const isActiveFilter = filterStatus === 'active'; configs = configs.filter(config => config.is_active === isActiveFilter); } return configs; }, [originalConfigs, filterStatus]);

 // --- Renderização ---
   if (clientsLoading || taxTypesLoading) { return <div id="notif-loading-initial"><FontAwesomeIcon icon={faSpinner} spin size="2x" /> Carregando dados iniciais...</div>; }
   if ((clientsError || taxTypesError) && originalConfigs.length === 0) { return <div id="notif-msg-standalone-error" className="notification-message error"><FontAwesomeIcon icon={faExclamationTriangle}/> Erro ao carregar dados essenciais: {clientsError || taxTypesError}</div>; }

  return (
    <Fragment>
      {/* Header */}
      <div id="notif-header">
        <h1>{editingConfigId ? 'Editar Notificação' : 'Configurar Nova Notificação'}</h1>
        <div id="notif-last-updated" onClick={handleRefresh} title="Clique para atualizar"> <FontAwesomeIcon icon={faSyncAlt} spin={isRefreshingData} /> <span>{isRefreshingData ? 'Atualizando...' : (lastUpdated ? ` Última atualização: ${lastUpdated}` : 'Atualizar dados')}</span> </div>
      </div>

      {/* Mensagens */}
      {notificationMessage && ( <div id="notif-message-container" className={`notification-message ${notificationMessage.type}`}> <FontAwesomeIcon icon={notificationMessage.type === 'success' ? faCheckCircle : faTimesCircle} /> {notificationMessage.text} <button onClick={() => setNotificationMessage(null)}>&times;</button> </div> )}

      {/* Layout Lado a Lado */}
      <div id="notifications-layout">

        {/* Coluna Esquerda: Formulário */}
        <div id="notif-form-column" className="layout-column">
          <div id="notif-form-card" className="notification-card">
            <form onSubmit={handleSubmit}>

              {/* Fieldset Cliente */}
              <fieldset className="fieldset-bordered">
                <legend><FontAwesomeIcon icon={faUsers} /> Destinatário</legend>
                <div id="notif-client-group" className="form-group">
                   <div id="notif-client-mode-selector" className="segmented-control">
                       <button type="button" className={clientSelectionMode === 'individual' ? 'active' : ''} onClick={() => handleClientModeChange('individual')} disabled={!!editingConfigId && clientSelectionMode !== 'individual'}> <FontAwesomeIcon icon={faUser} /> Individualmente </button>
                       <button type="button" className={clientSelectionMode === 'all' ? 'active' : ''} onClick={() => handleClientModeChange('all')} disabled={!!editingConfigId && clientSelectionMode !== 'all'}> <FontAwesomeIcon icon={faGlobe} /> Todos </button>
                   </div>
                   {clientSelectionMode === 'individual' && (
                     <Fragment>
                       <label htmlFor="notif-client-search-input" className="sr-only">Pesquisar Cliente</label>
                       <div className="autocomplete-wrapper"> <FontAwesomeIcon icon={faSearch} className="search-icon" /> <input type="text" id="notif-client-search-input" placeholder="Pesquisar e adicionar cliente..." value={clientSearchTerm} onChange={handleClientSearchChange} onFocus={() => clientSearchTerm.length > 0 && setShowClientDropdown(true)} autoComplete="off" disabled={!!editingConfigId} /> {showClientDropdown && filteredClients.length > 0 && ( <ul className="autocomplete-dropdown"> {filteredClients.map((client) => (<li key={client.id} onClick={() => handleAddClient(client)}>{client.name} ({client.nif})</li>))} </ul> )} </div>
                       {clientSearchTerm.length > 0 && filteredClients.length === 0 && !clientsLoading && <small className="no-results">Nenhum cliente encontrado ou já selecionado.</small>}
                       <div id="notif-selected-clients-list" className="selected-items-list"> {selectedClients.map(client => ( <span key={client.id} className="selected-item-pill"> {client.name} ({client.nif}) {!editingConfigId && ( <button type="button" onClick={() => handleRemoveClient(client.id)} className="remove-item-button" title="Remover cliente">&times;</button> )} </span> ))} {selectedClients.length === 0 && !editingConfigId && <small className="no-selection">Nenhum cliente selecionado.</small>} </div>
                     </Fragment>
                   )}
                   {clientSelectionMode === 'all' && ( <div className="info-all-selected"> <FontAwesomeIcon icon={faCheckCircle} /> Aplicar a todos os clientes.</div> )}
                   {editingConfigId && clientSelectionMode === 'individual' && selectedClients.length > 0 && <div className="info-edit">A editar para: <strong>{selectedClients[0].name} ({selectedClients[0].nif})</strong></div>}
                   {editingConfigId && clientSelectionMode === 'all' && <div className="info-edit">A editar configuração para <strong>Todos os Clientes</strong>.</div>}
                </div>
              </fieldset>

              {/* Fieldset Configuração */}
              <fieldset className="fieldset-bordered">
                 <legend><FontAwesomeIcon icon={faBell} /> Configuração da Notificação</legend>
                 <div className="form-row">
                     <div className="form-group"> <label htmlFor="notif_type_select">Tipo <span className="required-indicator">*</span></label> <select id="notif_type_select" name="notification_type" value={formData.notification_type} onChange={handleChange} required> <option value="all">Todos os Tipos</option> {notificationTypes.map((type) => (<option key={type} value={type}>{type}</option>))} </select> </div>
                     <div className="form-group"> <label htmlFor="notif_tax_type_select">Imposto <span className="required-indicator">*</span></label> <select id="notif_tax_type_select" name="tax_type" value={formData.tax_type} onChange={handleChange} required> <option value="all">Todos os Impostos</option> {taxTypes?.map((tax) => (<option key={tax.id} value={tax.id}>{tax.name}</option>))} </select> </div>
                 </div>
              </fieldset>

              {/* Fieldset Periodicidade (Sem o estado Ativo) */}
              <fieldset className="fieldset-bordered">
                 <legend><FontAwesomeIcon icon={faClock} /> Periodicidade</legend>
                 <div className="form-row">
                     <div className="form-group"> <label htmlFor="notif_frequency_select">Frequência <span className="required-indicator">*</span></label> <select id="notif_frequency_select" name="frequency" value={formData.frequency} onChange={handleChange} required> {frequencies.map((freq) => (<option key={freq} value={freq}>{freq}</option>))} </select> </div>
                     <div className="form-group"> <label htmlFor="notif_start_period_input">Antecedência (dias)<span className="required-indicator">*</span></label> <input id="notif_start_period_input" type="number" name="start_period" value={formData.start_period} min="1" max="12" onChange={handleChange} required /> </div>
                 </div>
                 {/* REMOVIDO O TOGGLE SWITCH DAQUI */}
              </fieldset>

              {/* Botões */}
              <div id="notif-form-actions" className="form-actions">
                  <button id="notif-submit-button" type="submit" className="button-primary" disabled={submitLoading || actionLoading || (clientSelectionMode === 'individual' && selectedClients.length === 0 && !editingConfigId)}> <FontAwesomeIcon icon={submitLoading ? faSpinner : faSave} spin={submitLoading} /> {submitLoading ? 'A guardar...' : (editingConfigId ? 'Atualizar' : 'Guardar')} </button>
                  {editingConfigId && ( <button id="notif-cancel-edit-button" type="button" className="button-secondary" onClick={handleCancelEdit} disabled={submitLoading || actionLoading}> Cancelar </button> )}
               </div>
            </form>
          </div>
        </div>

        {/* Coluna Direita: Tabela */}
        <div id="notif-table-column" className="layout-column">
          <div id="notif-list-card" className="notification-card">
            <div id="notif-table-controls" className="table-controls"> <h2><FontAwesomeIcon icon={faList}/> Notificações Existentes</h2> <div id="notif-filter-group" className="filter-group"> <label htmlFor="notif-filterStatus-select"><FontAwesomeIcon icon={faFilter} /> Estado:</label> <select id="notif-filterStatus-select" value={filterStatus} onChange={handleFilterChange}> <option value="all">Todos</option> <option value="active">Ativos</option> <option value="inactive">Inativos</option> </select> </div> </div>
            {configsLoading && !isRefreshingData && <div id="notif-loading-placeholder" className="loading-placeholder"><FontAwesomeIcon icon={faSpinner} spin /> Carregando...</div>}
            {configsError && !configsLoading && ( <div id="notif-error-placeholder" className="error-placeholder"> <span><FontAwesomeIcon icon={faExclamationTriangle}/> Erro: {configsError}</span> <button id="notif-retry-button" onClick={handleRefresh} className="button-secondary retry-button" disabled={isRefreshingData}> <FontAwesomeIcon icon={faRedo} spin={isRefreshingData} /> Tentar Novamente </button> </div> )}
            {!configsLoading && !configsError && (
              <div id="notif-table-responsive" className="table-responsive">
                 <table id="notifications-table-element" className="notifications-table">
                  <thead> <tr> <th>Cliente (NIF)</th><th>Tipo Notif.</th><th>Imposto</th><th>Frequência</th><th>Mês Início</th><th>Estado</th><th>Ações</th> </tr> </thead>
                  <tbody>
                    {displayedConfigs.length === 0 && ( <tr><td colSpan={7} className="no-data">Nenhuma configuração encontrada {filterStatus !== 'all' ? 'para o filtro aplicado' : ''}.</td></tr> )}
                    {displayedConfigs.map((config) => {
                       let clientDisplay = `ID: ${config.client_id}`; if (config.client_id === 'all') { clientDisplay = 'Todos'; } else { const client = allClients.find(c => c.id === config.client_id); if(client) clientDisplay = `${client.name} (${client.nif})`; }
                       const typeDisplay = config.notification_type === 'all' ? 'Todos' : config.notification_type;
                       const taxDisplay = config.tax_type === 'all' ? 'Todos' : (taxTypes.find(t => t.id === config.tax_type)?.name || `ID: ${config.tax_type}`);
                       return (
                        <tr key={config.id}>
                          <td data-label="Cliente">{clientDisplay}</td> <td data-label="Tipo Notif.">{typeDisplay}</td> <td data-label="Imposto">{taxDisplay}</td> <td data-label="Frequência">{config.frequency}</td> <td data-label="Mês Início" className="cell-center">{config.start_period}</td> <td data-label="Estado" className="cell-center"><span className={`status ${config.is_active ? 'active' : 'inactive'}`}>{config.is_active ? 'Ativo' : 'Inativo'}</span></td>
                          <td data-label="Ações" className="action-buttons">
                            {/* O botão Editar ainda pode fazer sentido para editar Frequência/MêsInício mesmo para 'all' configs */}
                            <button onClick={() => handleEdit(config)} title="Editar" disabled={actionLoading || submitLoading} className="action-button edit"><FontAwesomeIcon icon={faEdit} /></button>
                            <button onClick={() => handleTableAction('toggle', config.id!, config.is_active)} title={config.is_active ? 'Desativar' : 'Ativar'} disabled={actionLoading || submitLoading} className={`action-button toggle ${config.is_active ? 'toggle-off' : 'toggle-on'}`}><FontAwesomeIcon icon={config.is_active ? faToggleOff : faToggleOn} /></button>
                            <button onClick={() => handleTableAction('delete', config.id!)} title="Apagar" disabled={actionLoading || submitLoading} className="action-button delete"><FontAwesomeIcon icon={faTrashAlt} /></button>
                          </td>
                        </tr> );
                     })}
                  </tbody>
                </table>
              </div>
            )}
            {(actionLoading) && <div id="notif-action-loading" className="loading-placeholder"><FontAwesomeIcon icon={faSpinner} spin /> Processando...</div>}
          </div>
        </div>

      </div> {/* Fim notifications-layout */}
    </Fragment>
  );
};

export default Notifications;