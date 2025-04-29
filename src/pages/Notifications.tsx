import React, { Fragment, useEffect, useState, useMemo, useCallback } from 'react';
// Importar o CSS
import './Notifications.css';
// Importar react-select
import Select, { MultiValue } from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSave, faSpinner, faSyncAlt, faUser, faBell, faMoneyBill, faClock, faToggleOn, faToggleOff,
    faEdit, faTrashAlt, faPlusCircle, faSearch, faTimesCircle, faExclamationTriangle, faCheckCircle,
    faFilter, faRedo, faUsers, faCheckSquare, faSquare, faGlobe, faList, faCheck,
    faChevronLeft, faChevronRight // Ícones para paginação
} from '@fortawesome/free-solid-svg-icons';
// Ajuste o caminho para o seu hook useApi
import useApi from '../hooks/useApi';

// --- Constantes ---
const API_BASE_URL = 'atmate-gateway'; // ** AJUSTAR SE NECESSÁRIO **
// Frequências traduzidas para Português
const frequencies: string[] = ['Diário', 'Semanal', 'Mensal', 'Trimestral'];
const ITEMS_PER_PAGE = 10; // Itens por página na tabela

// Mapeamento Estático Nomes -> IDs para Tipos de Notificação
// ** VERIFICAR IDs REAIS **
const notificationTypeIdMap: Record<string, number> = {
    'EMAIL': 1, // O exemplo da API diz ID 1 = Email
    'SMS': 2   // Assumindo ID 2 para SMS
};
// Deriva a lista de tipos com ID e Nome
const allNotificationTypes: Array<{ id: number; name: string }> = Object.entries(notificationTypeIdMap).map(([name, id]) => ({ id, name }));

// Interface para o formato de opção esperado por react-select
type SelectOption = { value: number; label: string };

// Mapeamento para unidades de antecedência baseado na frequência (em Português)
const frequencyUnits: Record<string, string> = {
    'Diário': 'dias',
    'Semanal': 'semanas',
    'Mensal': 'meses',
    'Trimestral': 'trimestres'
};

// --- Interfaces ---
// Interfaces baseadas na ESTRUTURA REAL da API GET
interface ApiClient { id: number; name: string; nif: number; /* outros campos se necessário */ }
interface ApiNotificationType { id: number; description: string; /* outros campos */ }
interface ApiTaxType { id: number; description: string; /* outros campos */ }

// Interface principal para cada item retornado por GET /notification/getNotificationConfig
interface ApiNotificationConfig {
    id: number;
    client: ApiClient | null;
    notificationType: ApiNotificationType;
    taxType: ApiTaxType;
    frequency: string; // Espera-se que a API retorne 'Diário', 'Semanal', etc. ou que mapeemos? Assumindo que retorna o valor em PT ou EN que corresponda a `frequencies`
    startPeriod: number;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

// Interface para representar um GRUPO de configurações idênticas na tabela
interface GroupedConfig {
    key: string;
    notificationType: ApiNotificationType;
    taxType: ApiTaxType;
    frequency: string;
    startPeriod: number;
    isActive: boolean;
    clients: Array<ApiClient | null>;
    originalIds: number[];
}

// Interfaces antigas
interface Client { id: number; name: string; nif: number; }
interface TaxType { id: number; name: string; description?: string; } // Adicionado description opcional

// Estado local do formulário (com arrays de IDs)
interface FormDataState {
    selectedNotificationTypeIds: number[];
    selectedTaxTypeIds: number[];
    frequency: string; // Agora guarda 'Diário', 'Semanal', etc.
    start_period: number; // Nome do campo no estado (pode manter ou mudar para startPeriod)
}

// DTO para Criação (POST /create)
interface CreateNotificationRequestPayload {
    clientsIDs: number[];
    taxTypeIDs: number[];
    notificationTypeList: number[];
    frequency: string; // Envia 'Diário', 'Semanal', etc. (backend precisa de interpretar)
    isActive: boolean;
    startPeriod: number; // Nome do campo no DTO (backend precisa interpretar com base na frequency)
}

// Resposta genérica da API
interface ApiResponseData {
    message?: string;
    data?: ApiNotificationConfig | any;
}

// Detalhes para ações da tabela
interface ActionDetails {
    url: string;
    method: 'PUT' | 'DELETE';
    body?: any;
}

type ClientSelectionMode = 'all' | 'individual';

// --- Componente Principal ---
const Notifications: React.FC = () => {
    // --- Estados ---
    const initialFormData: FormDataState = {
        selectedNotificationTypeIds: [],
        selectedTaxTypeIds: [],
        frequency: frequencies[0], // Default: 'Diário'
        start_period: 1,           // Nome do estado
    };
    const [formData, setFormData] = useState<FormDataState>(initialFormData);
    const [isActiveEdit, setIsActiveEdit] = useState<boolean>(true);
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
    const [currentPage, setCurrentPage] = useState(1);

    // --- API Hooks ---
    const { data: allClientsData, loading: clientsLoading, error: clientsError } = useApi<Client[]>(`${API_BASE_URL}/clients/getClients?refresh=${refreshTrigger}`, { enabled: true });
    const allClients = useMemo(() => allClientsData || [], [allClientsData]);
    const { data: taxTypesData, loading: taxTypesLoading, error: taxTypesError } = useApi<TaxType[]>(`${API_BASE_URL}/tax/getTypes?refresh=${refreshTrigger}`, { enabled: true });
    const taxTypes = useMemo(() => taxTypesData || [], [taxTypesData]);
    const { data: existingConfigsResponse, loading: configsLoading, error: configsError } = useApi<ApiNotificationConfig[]>(`${API_BASE_URL}/notification/getNotificationConfig?refresh=${refreshTrigger}`, { enabled: true });
    const originalConfigs = useMemo(() => existingConfigsResponse || [], [existingConfigsResponse]);

    // --- Processamento de Dados (Agrupamento, Filtragem, Paginação) ---
    const groupedConfigs = useMemo<GroupedConfig[]>(() => {
        const groups: Record<string, GroupedConfig> = {};
        originalConfigs.forEach((config) => {
            // A chave de agrupamento agora usa os IDs e a frequência (assumindo que a API retorna o valor esperado ou mapeamos)
            // Garante que temos os IDs e frequency válidos antes de criar a chave
            const notificationTypeId = config.notificationType?.id;
            const taxTypeId = config.taxType?.id;
            const freq = config.frequency; // Usar a frequência como vem da API
            const startP = config.startPeriod;
            const isActive = config.isActive;

            if (notificationTypeId === undefined || taxTypeId === undefined || !freq || startP === undefined || isActive === undefined) {
                console.warn("Configuração incompleta ignorada no agrupamento:", config);
                return; // Pula esta configuração se faltar dados chave
            }

            const groupKey = `${notificationTypeId}-${taxTypeId}-${freq}-${startP}-${isActive}`;

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    key: groupKey,
                    notificationType: config.notificationType,
                    taxType: config.taxType,
                    frequency: freq,
                    startPeriod: startP,
                    isActive: isActive,
                    clients: [],
                    originalIds: []
                };
            }
            groups[groupKey].clients.push(config.client);
            groups[groupKey].originalIds.push(config.id);
        });
        return Object.values(groups);
    }, [originalConfigs]);

    const filteredGroupedConfigs = useMemo<GroupedConfig[]>(() => {
        let configs = [...groupedConfigs];
        if (filterStatus !== 'all') {
            const isActiveFilter = filterStatus === 'active';
            configs = configs.filter(group => group.isActive === isActiveFilter);
        }
        return configs;
    }, [groupedConfigs, filterStatus]);

    const paginatedConfigs = useMemo<GroupedConfig[]>(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredGroupedConfigs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredGroupedConfigs, currentPage]);

    const totalPages = useMemo(() => Math.ceil(filteredGroupedConfigs.length / ITEMS_PER_PAGE), [filteredGroupedConfigs]);

    // --- Formatação de Dados para React Select ---
    const taxTypeOptions = useMemo<SelectOption[]>(() => {
        return taxTypes.map(tax => ({
             value: tax.id,
             // Usa description primeiro, depois name como fallback
             label: tax.description || tax.name
            }));
    }, [taxTypes]);

    const notificationTypeOptions = useMemo<SelectOption[]>(() => allNotificationTypes.map(type => ({ value: type.id, label: type.name })), []);

    // --- Lógica de Submissão ---
    const submitEndpoint = editingConfigId ? `${API_BASE_URL}/notification/update/${editingConfigId}` : `${API_BASE_URL}/notification/create`;
    const submitMethod = editingConfigId ? 'PUT' : 'POST';

    const getSubmitBody = useCallback((): CreateNotificationRequestPayload | any => {
        if (!editingConfigId) { // CRIAÇÃO
            const payload: CreateNotificationRequestPayload = {
                clientsIDs: clientSelectionMode === 'all' ? allClients.map(c => c.id) : selectedClients.map(c => c.id),
                taxTypeIDs: formData.selectedTaxTypeIds,
                notificationTypeList: formData.selectedNotificationTypeIds,
                frequency: formData.frequency, // Envia valor em PT ('Diário', 'Semanal', etc)
                isActive: true,
                startPeriod: formData.start_period, // Envia o número; backend interpreta com base na frequency
            };
            console.log("Payload para /create:", JSON.stringify(payload));
            return payload;
        } else { // EDIÇÃO (Placeholder - Ações desabilitadas para grupos)
            console.warn("Construindo payload para /update/ - AÇÕES DE EDIÇÃO DESABILITADAS PARA GRUPOS");
            const updatePayload: any = {
                notificationType: formData.selectedNotificationTypeIds[0] ?? null, // Palpite
                taxType: formData.selectedTaxTypeIds[0] ?? null, // Palpite
                frequency: formData.frequency, // Envia valor em PT
                startPeriod: formData.start_period, // Envia número
                isActive: isActiveEdit,
                clientId: clientSelectionMode === 'all' ? null : (selectedClients[0]?.id ?? null) // Palpite
            };
            console.log("Payload (Placeholder) para /update:", JSON.stringify(updatePayload));
            return updatePayload;
        }
    }, [editingConfigId, formData, isActiveEdit, clientSelectionMode, selectedClients, allClients]);

    // Hook useApi para submissão
    const { data: submitResponse, loading: submitLoading, error: submitError } = useApi<ApiResponseData>(submitEndpoint, { method: submitMethod, body: getSubmitBody(), enabled: submitTrigger > 0, });
    // Hook useApi para ações
    const { loading: actionLoading, error: actionError, data: actionResponse } = useApi<ApiResponseData>(actionDetails?.url || '', { method: actionDetails?.method || 'PUT', body: actionDetails?.body, enabled: actionTrigger > 0 && !!actionDetails, });

    // --- Efeitos ---
    useEffect(() => { /* ... (Atualizar lastUpdated - igual) ... */ if (!clientsLoading && !taxTypesLoading && !configsLoading) { const now = new Date(); const dateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }; const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }; setLastUpdated(`${now.toLocaleDateString('pt-PT', dateOptions)} ${now.toLocaleTimeString('pt-PT', timeOptions)}`); setIsRefreshingData(false); } }, [clientsLoading, taxTypesLoading, configsLoading]);
    const resetFormAndState = useCallback(() => { /* ... (Reset - igual) ... */ setFormData(initialFormData); setIsActiveEdit(true); setSelectedClients([]); setClientSelectionMode('individual'); setEditingConfigId(null); setClientSearchTerm(''); setShowClientDropdown(false); setSubmitTrigger(0); setActionDetails(null); setActionTrigger(0); setNotificationMessage(null); }, [initialFormData]);
    useEffect(() => { /* ... (Lidar com resposta da submissão - igual) ... */ if (submitTrigger > 0) { if (!submitLoading) { if (submitError) { setNotificationMessage({ type: 'error', text: `Erro: ${submitError}` }); } else { setNotificationMessage({ type: 'success', text: `Configuração ${editingConfigId ? 'atualizada' : 'criada(s)'}!` }); resetFormAndState(); setRefreshTrigger(prev => prev + 1); } setSubmitTrigger(0); } } }, [submitTrigger, submitLoading, submitError, editingConfigId, resetFormAndState, setRefreshTrigger]);
    useEffect(() => { /* ... (Lidar com resposta das ações - igual) ... */ if (actionTrigger > 0) { if(!actionLoading){ if (actionError) { setNotificationMessage({ type: 'error', text: `Erro na ação: ${actionError}` }); } else { setNotificationMessage({ type: 'success', text: actionResponse?.message || `Ação concluída!` }); setRefreshTrigger(prev => prev + 1); } setActionDetails(null); setActionTrigger(0); } } }, [actionTrigger, actionLoading, actionError, actionResponse, setRefreshTrigger]);
    useEffect(() => { /* ... (Limpar mensagens - igual) ... */ let timerId: NodeJS.Timeout | null = null; if (notificationMessage) { timerId = setTimeout(() => setNotificationMessage(null), 5000); } return () => { if (timerId) clearTimeout(timerId); }; }, [notificationMessage]);
    useEffect(() => { setCurrentPage(1); }, [filterStatus]); // Reset página ao filtrar

    // --- Handlers ---
    const handleStandardChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { /* ... (igual) ... */ const { name, value } = e.target; const processedValue = name === 'start_period' ? (parseInt(value, 10) || 1) : value; setFormData(prev => ({ ...prev, [name]: processedValue })); }, []);
    const handleReactSelectChange = useCallback((fieldName: 'selectedNotificationTypeIds' | 'selectedTaxTypeIds') => { /* ... (igual) ... */ return (selectedOptions: MultiValue<SelectOption>) => { const selectedIds = selectedOptions ? selectedOptions.map(option => option.value) : []; setFormData(prev => ({ ...prev, [fieldName]: selectedIds })); }; }, []);
    const handleClientSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { /* ... (igual) ... */ const term = e.target.value; setClientSearchTerm(term); setShowClientDropdown(term.length > 0); }, []);
    const handleAddClient = useCallback((client: Client) => { /* ... (igual) ... */ if (!selectedClients.some(c => c.id === client.id)) { setSelectedClients(prev => [...prev, client]); } setClientSearchTerm(''); setShowClientDropdown(false); }, [selectedClients]);
    const handleRemoveClient = useCallback((clientId: number) => { /* ... (igual) ... */ setSelectedClients(prev => prev.filter(c => c.id !== clientId)); }, []);
    const handleClientModeChange = useCallback((mode: ClientSelectionMode) => { /* ... (igual) ... */ setClientSelectionMode(mode); if (mode === 'all') { setSelectedClients([]); setClientSearchTerm(''); setShowClientDropdown(false); } }, []);
    const handleSubmit = useCallback((e: React.FormEvent) => { /* ... (igual, valida .length > 0) ... */ e.preventDefault(); if (!editingConfigId) { if (clientSelectionMode === 'individual' && selectedClients.length === 0) { setNotificationMessage({ type: 'error', text: 'Selecione cliente(s).' }); return; } if (clientSelectionMode === 'all' && allClients.length === 0) { setNotificationMessage({ type: 'error', text: 'Não há clientes para "Todos".' }); return; } if (formData.selectedNotificationTypeIds.length === 0) { setNotificationMessage({ type: 'error', text: 'Selecione tipo(s) de notificação.' }); return; } if (formData.selectedTaxTypeIds.length === 0) { setNotificationMessage({ type: 'error', text: 'Selecione imposto(s).' }); return; } } else { if (formData.selectedNotificationTypeIds.length === 0) { setNotificationMessage({ type: 'error', text: 'Selecione tipo(s) de notificação.' }); return; } if (formData.selectedTaxTypeIds.length === 0) { setNotificationMessage({ type: 'error', text: 'Selecione imposto(s).' }); return; } } if (!formData.frequency) { setNotificationMessage({ type: 'error', text: 'Selecione a Frequência.' }); return; } console.log("Formulário válido, disparando submissão..."); setSubmitTrigger(prev => prev + 1); }, [formData, selectedClients, clientSelectionMode, editingConfigId, allClients]);
    const handleRefresh = useCallback(() => { /* ... (igual) ... */ setIsRefreshingData(true); setRefreshTrigger((prev) => prev + 1); }, []);
    const handleEdit = useCallback((config: ApiNotificationConfig) => { /* ... (igual, usa ApiNotificationConfig) ... */ console.warn("handleEdit: Verifique se `config` (do GET) tem IDs corretos."); setEditingConfigId(config.id); const initialNotifIds = config.notificationType ? [config.notificationType.id] : []; const initialTaxIds = config.taxType ? [config.taxType.id] : []; setFormData({ selectedNotificationTypeIds: initialNotifIds, selectedTaxTypeIds: initialTaxIds, frequency: config.frequency, start_period: config.startPeriod, }); setIsActiveEdit(config.isActive); if (config.client) { setClientSelectionMode('individual'); setSelectedClients([{ id: config.client.id, name: config.client.name, nif: config.client.nif }]); } else { setClientSelectionMode('all'); setSelectedClients([]); } setClientSearchTerm(''); setShowClientDropdown(false); window.scrollTo(0, 0); setNotificationMessage(null); }, []); // Removido allClients como dependência explícita aqui
    const handleCancelEdit = useCallback(() => { /* ... (igual) ... */ resetFormAndState(); }, [resetFormAndState]);
    const handleTableAction = useCallback((action: 'delete' | 'toggle', originalConfigId: number, currentStatus?: boolean) => { /* ... (igual, com warnings) ... */ console.warn("URLs e Payloads para Delete/Toggle precisam ser verificados!"); let details: ActionDetails | null = null; if (action === 'delete') { if (!window.confirm(`Apagar config ID ${originalConfigId}?`)) return; details = { url: `${API_BASE_URL}/notification/delete/${originalConfigId}`, method: 'DELETE' }; } else if (action === 'toggle') { details = { url: `${API_BASE_URL}/notification/update/${originalConfigId}`, method: 'PUT', body: { isActive: !currentStatus } }; } if (details) { setActionDetails(details); setActionTrigger(prev => prev + 1); } }, []);
    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => { /* ... (igual) ... */ setFilterStatus(e.target.value as 'all' | 'active' | 'inactive'); };
    const handleNextPage = () => { /* ... (igual) ... */ setCurrentPage(prev => Math.min(prev + 1, totalPages)); };
    const handlePrevPage = () => { /* ... (igual) ... */ setCurrentPage(prev => Math.max(prev - 1, 1)); };
    const handleGoToPage = (pageNumber: number) => { /* ... (igual) ... */ setCurrentPage(Math.max(1, Math.min(pageNumber, totalPages))); };

    // --- Filtros e Mapeamentos para Renderização ---
    const filteredClients = useMemo(() => { /* ... (igual) ... */ if (!clientSearchTerm || clientSelectionMode === 'all') return []; const selIds = new Set(selectedClients.map(c=>c.id)); return allClients.filter(c=>!selIds.has(c.id) && (c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || c.nif.toString().includes(clientSearchTerm))).slice(0,10); }, [clientSearchTerm, allClients, selectedClients, clientSelectionMode]);

    // --- Renderização ---
    if (clientsLoading || taxTypesLoading || configsLoading) { return <div id="notif-loading-initial"><FontAwesomeIcon icon={faSpinner} spin size="2x" /> Carregando...</div>; }
    if ((clientsError || taxTypesError || configsError) && originalConfigs.length === 0) { const err = clientsError || taxTypesError || configsError; return <div id="notif-msg-standalone-error" className="notification-message error"><FontAwesomeIcon icon={faExclamationTriangle}/> Erro: {err}</div>; }

    return (
        <Fragment>
            {/* Header */}
            <div id="notif-header"> <h1>{editingConfigId ? 'Editar Notificação' : 'Configurar Novas Notificações'}</h1> <div id="notif-last-updated" onClick={handleRefresh} title="Clique para atualizar" role="button" tabIndex={0}> <FontAwesomeIcon icon={faSyncAlt} spin={isRefreshingData} /> <span>{isRefreshingData ? ' Atualizando...' : (lastUpdated ? ` Última atualização: ${lastUpdated}` : ' Atualizar dados')}</span> </div> </div>

            {/* Mensagens */}
            {notificationMessage && ( <div id="notif-message-container" className={`notification-message ${notificationMessage.type}`} role="alert"> <FontAwesomeIcon icon={notificationMessage.type === 'success' ? faCheckCircle : faTimesCircle} /> <span className="message-text">{notificationMessage.text}</span> <button onClick={() => setNotificationMessage(null)} className="close-message" aria-label="Fechar">&times;</button> </div> )}

            {/* Layout (Aplicar CSS `align-items: flex-start` a este ID) */}
            <div id="notifications-layout">

                {/* Coluna Esquerda: Formulário */}
                <div id="notif-form-column" className="layout-column">
                    <div id="notif-form-card" className="notification-card">
                        <form onSubmit={handleSubmit} noValidate>
                             {/* Secção: Destinatário(s) */}
                             <fieldset className="fieldset-bordered"> <legend><FontAwesomeIcon icon={faUsers} /> Destinatário(s)</legend> <div id="notif-client-group" className="form-group"> {/* ... (Seleção de Modo e Cliente) ... */} <div id="notif-client-mode-selector" className="segmented-control" role="radiogroup" aria-label="Modo seleção cliente"> <button type="button" role="radio" aria-checked={clientSelectionMode === 'individual'} className={clientSelectionMode === 'individual' ? 'active' : ''} onClick={() => handleClientModeChange('individual')} disabled={!!editingConfigId && clientSelectionMode !== 'individual'} title={editingConfigId?"Bloqueado":"Individual"}> <FontAwesomeIcon icon={faUser} /> Individualmente </button> <button type="button" role="radio" aria-checked={clientSelectionMode === 'all'} className={clientSelectionMode === 'all' ? 'active' : ''} onClick={() => handleClientModeChange('all')} disabled={!!editingConfigId && clientSelectionMode !== 'all'} title={editingConfigId?"Bloqueado":"Todos"}> <FontAwesomeIcon icon={faGlobe} /> Todos </button> </div> {clientSelectionMode === 'individual' && ( <Fragment> <div className="autocomplete-wrapper"> <FontAwesomeIcon icon={faSearch} className="search-icon" /> <label htmlFor="notif-client-search-input" className="sr-only">Pesquisar Cliente</label> <input type="text" id="notif-client-search-input" placeholder="Pesquisar e adicionar cliente..." value={clientSearchTerm} onChange={handleClientSearchChange} onFocus={() => clientSearchTerm.length > 0 && setShowClientDropdown(true)} autoComplete="off" disabled={!!editingConfigId} aria-autocomplete="list" /> {showClientDropdown && filteredClients.length > 0 && ( <ul className="autocomplete-dropdown" role="listbox"> {filteredClients.map((client) => (<li key={client.id} onClick={() => handleAddClient(client)} role="option">{client.name} ({client.nif})</li>))} </ul> )} </div> {clientSearchTerm.length > 0 && filteredClients.length === 0 && !clientsLoading && (<small className="no-results">Nenhum cliente.</small>)} <div id="notif-selected-clients-list" className="selected-items-list" aria-live="polite"> <span className="sr-only">Selecionados:</span> {selectedClients.map(client => (<span key={client.id} className="selected-item-pill"> {client.name} {!editingConfigId && (<button type="button" onClick={() => handleRemoveClient(client.id)} className="remove-item-button" title={`Remover ${client.name}`} aria-label={`Remover ${client.name}`}> &times; </button>)} </span>))} {selectedClients.length === 0 && !editingConfigId && (<small className="no-selection">Nenhum.</small>)} {editingConfigId && selectedClients.length === 1 && (<div className="info-edit">Editando: <strong>{selectedClients[0].name}</strong></div>)} {editingConfigId && selectedClients.length === 0 && (<div className="info-edit error">Cliente original?</div>)} </div> </Fragment> )} {clientSelectionMode === 'all' && ( <div className="info-all-selected"> <FontAwesomeIcon icon={faCheckCircle} /> Aplicar a<strong>todos ({allClients.length})</strong>. {editingConfigId && (<div className="info-edit">Editando config global.</div>)} </div> )} </div> </fieldset>

                             {/* Secção: Configuração (React Select) */}
                             <fieldset className="fieldset-bordered"> <legend><FontAwesomeIcon icon={faBell} /> Configuração da Notificação</legend> {/* React Select: Tipo(s) */} <div className="form-group"> <label id="react-select-notif-type-label" htmlFor="notif-type-select-react">Tipo(s) <span className="required-indicator">*</span></label> <Select<SelectOption, true> inputId='notif-type-select-react' isMulti name="selectedNotificationTypeIds" options={notificationTypeOptions} className="basic-multi-select" classNamePrefix="select" placeholder="Selecione..." aria-labelledby="react-select-notif-type-label" onChange={handleReactSelectChange('selectedNotificationTypeIds')} value={notificationTypeOptions.filter(o=>formData.selectedNotificationTypeIds.includes(o.value))} isClearable closeMenuOnSelect={false} /> </div> {/* React Select: Imposto(s) */} <div className="form-group"> <label id="react-select-tax-type-label" htmlFor="tax-type-select-react">Imposto(s) <span className="required-indicator">*</span></label> <Select<SelectOption, true> inputId='tax-type-select-react' isMulti name="selectedTaxTypeIds" options={taxTypeOptions} className="basic-multi-select" classNamePrefix="select" placeholder="Selecione..." aria-labelledby="react-select-tax-type-label" onChange={handleReactSelectChange('selectedTaxTypeIds')} value={taxTypeOptions.filter(o=>formData.selectedTaxTypeIds.includes(o.value))} isClearable closeMenuOnSelect={false} /> </div> </fieldset>

                             {/* Secção: Periodicidade (COM LABEL DINÂMICA) */}
                             <fieldset className="fieldset-bordered"> <legend><FontAwesomeIcon icon={faClock} /> Periodicidade</legend> <div className="form-row"> {/* Frequência */} <div className="form-group"> <label htmlFor="notif_frequency_select">Frequência <span className="required-indicator">*</span></label> <select id="notif_frequency_select" name="frequency" value={formData.frequency} onChange={handleStandardChange} required> {frequencies.map((freq) => (<option key={freq} value={freq}>{freq}</option>))} </select> </div> {/* Antecedência (Label Dinâmica) */} <div className="form-group"> <label htmlFor="notif_start_period_input"> Antecedência ({frequencyUnits[formData.frequency] || 'dias'}) <span className="required-indicator">*</span> </label> <input id="notif_start_period_input" type="number" name="start_period" value={formData.start_period} min="1" onChange={handleStandardChange} required aria-describedby="start-period-desc"/> <small id="start-period-desc" className="input-description"> Nº de {frequencyUnits[formData.frequency] || 'dias'} antes do prazo. </small> </div> </div> </fieldset>

                             {/* Botões */}
                             <div id="notif-form-actions" className="form-actions"> <button id="notif-submit-button" type="submit" className="button-primary" disabled={submitLoading || actionLoading || (clientSelectionMode === 'individual' && selectedClients.length === 0 && !editingConfigId)}> <FontAwesomeIcon icon={submitLoading ? faSpinner : faSave} spin={submitLoading} /> {submitLoading ? 'A guardar...' : (editingConfigId ? 'Atualizar' : 'Guardar')} </button> {editingConfigId && ( <button id="notif-cancel-edit-button" type="button" className="button-secondary" onClick={handleCancelEdit} disabled={submitLoading || actionLoading}> Cancelar </button> )} </div>
                        </form>
                    </div>
                </div>

                {/* Coluna Direita: Tabela */}
                <div id="notif-table-column" className="layout-column">
                     <div id="notif-list-card" className="notification-card">
                         {/* Controles */}
                         <div id="notif-table-controls"> <h2><FontAwesomeIcon icon={faList}/> Existentes ({filteredGroupedConfigs.length})</h2> <div id="notif-filter-group"> <label htmlFor="notif-filterStatus-select"><FontAwesomeIcon icon={faFilter} /> Filtrar:</label> <select id="notif-filterStatus-select" value={filterStatus} onChange={handleFilterChange}> <option value="all">Todos</option> <option value="active">Ativos</option> <option value="inactive">Inativos</option> </select> </div> </div>
                         {/* Loading / Error */}
                         {configsLoading && !isRefreshingData && ( <div id="notif-loading-placeholder"><FontAwesomeIcon icon={faSpinner} spin /> Carregando...</div> )}
                         {configsError && !configsLoading && ( <div id="notif-error-placeholder"> <span><FontAwesomeIcon icon={faExclamationTriangle}/> Erro: {configsError}</span> <button id="notif-retry-button" onClick={handleRefresh} disabled={isRefreshingData}> <FontAwesomeIcon icon={faRedo} spin={isRefreshingData} /> Tentar Novamente </button> </div> )}

                         {/* Tabela e Paginação */}
                         {!configsLoading && !configsError && (
                             <Fragment>
                                 <div id="notif-table-responsive">
                                     <table id="notifications-table-element" className="notifications-table">
                                         <thead> <tr> <th>Cliente(s)</th> <th>Tipo Notif.</th> <th>Imposto</th> <th>Frequência</th> <th>Antecedência</th> <th>Estado</th> <th>Ações</th> </tr> </thead>
                                         <tbody>
                                             {/* Tabela Vazia */}
                                             {paginatedConfigs.length === 0 && ( <tr><td colSpan={7} className="no-data">Nenhuma config {filterStatus !== 'all' ? ` '${filterStatus}'` : ''}.</td></tr> )}
                                             {/* Linhas da Tabela */}
                                             {paginatedConfigs.map((group) => {
                                                 const isGrouped = group.clients.length > 1 || group.originalIds.length > 1;
                                                 let clientDisplay = ''; if (group.clients.length === 1 && group.clients[0]) { clientDisplay = `${group.clients[0].name} (${group.clients[0].nif})`; } else if (group.clients.length > 1) { clientDisplay = `${group.clients.length} Clientes`; /* Add tooltip/modal here if needed */ } else { clientDisplay = 'Todos (?)'; }
                                                 const typeDisplay = group.notificationType.description || `ID:${group.notificationType.id}`;
                                                 const taxDisplay = group.taxType.description || `ID:${group.taxType.id}`;
                                                 const singleOriginalId = !isGrouped ? group.originalIds[0] : undefined;
                                                 // A unidade da antecedência na tabela agora também é dinâmica
                                                 const antecendenciaUnit = frequencyUnits[group.frequency] || 'dias';

                                                 return ( <tr key={group.key} className={group.isActive ? '' : 'inactive-row'}>
                                                     <td data-label="Cliente(s)">{clientDisplay}</td>
                                                     <td data-label="Tipo">{typeDisplay}</td>
                                                     <td data-label="Imposto">{taxDisplay}</td>
                                                     <td data-label="Freq.">{group.frequency}</td>
                                                     {/* Mostra a unidade correta na tabela */}
                                                     <td data-label="Antec." className="cell-center">{group.startPeriod} {antecendenciaUnit.substring(0, group.frequency === 'Diário' ? 1 : group.frequency === 'Semanal' ? 3 : 1)} {/* Abreviação: d, sem, m, t */} </td>
                                                     <td data-label="Estado" className="cell-center"><span className={`status ${group.isActive ? 'active' : 'inactive'}`}>{group.isActive ? 'Ativo' : 'Inativo'}</span></td>
                                                     <td data-label="Ações" className="action-buttons">
                                                          {/* Ações desabilitadas para grupos */}
                                                          <button onClick={() => singleOriginalId && handleEdit(originalConfigs.find(c=>c.id===singleOriginalId)!)} title={isGrouped ? "Edição desabilitada para grupos" : "Editar"} disabled={isGrouped || actionLoading || submitLoading} className="action-button edit"><FontAwesomeIcon icon={faEdit} /></button>
                                                         <button onClick={() => singleOriginalId && handleTableAction('toggle', singleOriginalId, group.isActive)} title={isGrouped ? "Ação desabilitada para grupos" : (group.isActive ? 'Desativar' : 'Ativar')} disabled={isGrouped || actionLoading || submitLoading} className={`action-button toggle ${group.isActive ? 'toggle-off' : 'toggle-on'}`}><FontAwesomeIcon icon={group.isActive ? faToggleOff : faToggleOn} /></button>
                                                         <button onClick={() => singleOriginalId && handleTableAction('delete', singleOriginalId)} title={isGrouped ? "Ação desabilitada para grupos" : "Apagar"} disabled={isGrouped || actionLoading || submitLoading} className="action-button delete"><FontAwesomeIcon icon={faTrashAlt} /></button>
                                                     </td> </tr> );
                                             })}
                                         </tbody>
                                     </table>
                                 </div>
                                 {/* Controlos de Paginação */}
                                 {totalPages > 1 && (
                                     <div className="pagination-controls">
                                         <span>Pág {currentPage} de {totalPages}</span>
                                         <div className="pagination-buttons">
                                             <button onClick={handlePrevPage} disabled={currentPage === 1} aria-label="Página anterior"> <FontAwesomeIcon icon={faChevronLeft} /> Ant </button>
                                             {/* TODO: Adicionar números de página clicáveis se necessário */}
                                             <button onClick={handleNextPage} disabled={currentPage === totalPages} aria-label="Próxima página"> Próx <FontAwesomeIcon icon={faChevronRight} /> </button>
                                         </div>
                                          <span>{filteredGroupedConfigs.length} Grupos</span>
                                     </div>
                                 )}
                             </Fragment>
                         )}
                         {/* Loading Ação */}
                         {(actionLoading) && ( <div id="notif-action-loading"> <FontAwesomeIcon icon={faSpinner} spin /> Processando... </div> )}
                     </div>
                 </div>

            </div> {/* Fim notifications-layout */}
        </Fragment>
    );
};

export default Notifications;