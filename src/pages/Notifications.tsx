import React, { Fragment, useEffect, useState, useMemo, useCallback } from 'react';
// Importar o CSS
import './Notifications.css';
// Importar react-select
import Select, { MultiValue } from 'react-select';
// Importar Axios para chamadas diretas
import axios, { AxiosError } from 'axios';
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
// !! IMPORTANTE: Defina a URL base COMPLETA da sua API !!
const FULL_API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // Use a sua URL base correta

const frequencies: string[] = ['Diário', 'Semanal', 'Mensal', 'Trimestral'];
const ITEMS_PER_PAGE = 10;

// Mapeamento Estático Nomes -> IDs para Tipos de Notificação
// ** VERIFICAR IDs REAIS **
const notificationTypeIdMap: Record<string, number> = { 'EMAIL': 1, 'SMS': 2 };
const allNotificationTypes: Array<{ id: number; name: string }> = Object.entries(notificationTypeIdMap).map(([name, id]) => ({ id, name }));

// Interface para o formato de opção esperado por react-select
type SelectOption = { value: number; label: string };

// Mapeamento para unidades de antecedência
const frequencyUnits: Record<string, string> = { 'Diário': 'dias', 'Semanal': 'semanas', 'Mensal': 'meses', 'Trimestral': 'trimestres' };

// --- Interfaces ---
// API GET Response structure
interface ApiClient { id: number; name: string; nif: number; }
interface ApiNotificationType { id: number; description: string; }
interface ApiTaxType { id: number; description: string; }
interface ApiNotificationConfig {
    id: number;
    client: ApiClient | null;
    notificationType: ApiNotificationType;
    taxType: ApiTaxType;
    frequency: string;
    startPeriod: number;
    active: boolean; // CORRIGIDO: Nome do campo como 'active'
    createdAt?: string;
    updatedAt?: string;
}

// Grouped Data for Table
interface GroupedConfig {
    key: string;
    notificationType: ApiNotificationType;
    taxType: ApiTaxType;
    frequency: string;
    startPeriod: number;
    active: boolean; // CORRIGIDO: Nome do campo como 'active'
    clients: Array<ApiClient | null>;
    originalIds: number[];
}

// Data fetched for form selects/autocomplete
interface Client { id: number; name: string; nif: number; }
interface TaxType { id: number; name: string; description?: string; }

// Form State
interface FormDataState {
    selectedNotificationTypeIds: number[];
    selectedTaxTypeIds: number[];
    frequency: string;
    startPeriod: number; // CORRIGIDO: para camelCase
}

// Create Payload (POST /create)
interface CreateNotificationRequestPayload {
    clientsIDs: number[];
    taxTypeIDs: number[];
    notificationTypeList: number[];
    frequency: string;
    active: boolean;  // CORRIGIDO: Nome do campo como 'active'
    startPeriod: number; // CORRIGIDO: para camelCase
}

// API Response structure (generic)
interface ApiResponseData {
    message?: string;
    data?: ApiNotificationConfig | any;
}

// Action Details for Table Buttons
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
        frequency: frequencies[0],
        startPeriod: 1, // CORRIGIDO: para camelCase
    };
    const [formData, setFormData] = useState<FormDataState>(initialFormData);
    const [activeEdit, setActiveEdit] = useState<boolean>(true); // CORRIGIDO: Nome do estado e setter
    const [selectedClients, setSelectedClients] = useState<Client[]>([]);
    const [clientSelectionMode, setClientSelectionMode] = useState<ClientSelectionMode>('individual');
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [editingConfigId, setEditingConfigId] = useState<number | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [createLoading, setCreateLoading] = useState<boolean>(false);
    const [submitTrigger, setSubmitTrigger] = useState(0);
    const [actionDetails, setActionDetails] = useState<ActionDetails | null>(null);
    const [actionTrigger, setActionTrigger] = useState(0);
    const [notificationMessage, setNotificationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [currentPage, setCurrentPage] = useState(1);

    // --- API Hooks ---
    // Certifique-se que o useApi constrói a URL corretamente com FULL_API_BASE_URL
    const { data: allClientsData, loading: clientsLoading, error: clientsError } = useApi<Client[]>(`atmate-gateway/clients/getClients?refresh=${refreshTrigger}`, { enabled: true });
    const allClients = useMemo(() => allClientsData || [], [allClientsData]);
    const { data: taxTypesData, loading: taxTypesLoading, error: taxTypesError } = useApi<TaxType[]>(`atmate-gateway/tax/getTypes?refresh=${refreshTrigger}`, { enabled: true });
    const taxTypes = useMemo(() => taxTypesData || [], [taxTypesData]);
    const { data: existingConfigsResponse, loading: configsLoading, error: configsError } = useApi<ApiNotificationConfig[]>(`atmate-gateway/notification/getNotificationConfig?refresh=${refreshTrigger}`, { enabled: true });
    const originalConfigs = useMemo(() => existingConfigsResponse || [], [existingConfigsResponse]);

    // --- Processamento de Dados (Agrupamento, Filtragem, Paginação) ---
    const groupedConfigs = useMemo<GroupedConfig[]>(() => {
        const groups: Record<string, GroupedConfig> = {};
        originalConfigs.forEach((config) => {
            const notificationTypeId = config.notificationType?.id;
            const taxTypeId = config.taxType?.id;
            const freq = config.frequency;
            const startP = config.startPeriod;
            const active = config.active; // CORRIGIDO: Usa 'active'

            if (notificationTypeId === undefined || taxTypeId === undefined || !freq || startP === undefined || active === undefined) {
                console.warn("Ignorando config incompleta:", config); return;
            }
            // CORRIGIDO: Usa 'active' na chave
            const groupKey = `<span class="math-inline">\{notificationTypeId\}\-</span>{taxTypeId}-<span class="math-inline">\{freq\}\-</span>{startP}-${active}`;

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    key: groupKey, notificationType: config.notificationType, taxType: config.taxType,
                    frequency: freq, startPeriod: startP, active: active, // CORRIGIDO: Usa 'active'
                    clients: [], originalIds: []
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
            const activeFilter = filterStatus === 'active';
            configs = configs.filter(group => group.active === activeFilter); // CORRIGIDO: Usa 'active'
        }
        return configs;
    }, [groupedConfigs, filterStatus]);

    const paginatedConfigs = useMemo<GroupedConfig[]>(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredGroupedConfigs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredGroupedConfigs, currentPage]);

    const totalPages = useMemo(() => Math.ceil(filteredGroupedConfigs.length / ITEMS_PER_PAGE), [filteredGroupedConfigs]);

    // --- Formatação para React Select ---
    const taxTypeOptions = useMemo<SelectOption[]>(() => taxTypes.map(tax => ({ value: tax.id, label: tax.description || tax.name })), [taxTypes]);
    const notificationTypeOptions = useMemo<SelectOption[]>(() => allNotificationTypes.map(type => ({ value: type.id, label: type.name })), []);

    // --- Lógica de Submissão ---
    const submitEndpoint = editingConfigId ? `/notification/update/${editingConfigId}` : ''; // Relativo a FULL_API_BASE_URL
    const submitMethod = 'PUT';

    const getSubmitBody = useCallback((): CreateNotificationRequestPayload | any => {
        if (!editingConfigId) { // CRIAÇÃO
            const payload: CreateNotificationRequestPayload = {
                clientsIDs: clientSelectionMode === 'all' ? allClients.map(c => c.id) : selectedClients.map(c => c.id),
                taxTypeIDs: formData.selectedTaxTypeIds,
                notificationTypeList: formData.selectedNotificationTypeIds,
                frequency: formData.frequency,
                active: true, // CORRIGIDO: Usa 'active'
                startPeriod: formData.startPeriod, // CORRIGIDO: Usa 'startPeriod'
            };
            console.log("Payload para /create:", JSON.stringify(payload));
            return payload;
        } else { // EDIÇÃO (Placeholder)
            console.warn("Construindo payload para /update/ - VERIFICAR API PUT!");
            const updatePayload: any = {
                notificationType: formData.selectedNotificationTypeIds[0] ?? null,
                taxType: formData.selectedTaxTypeIds[0] ?? null,
                frequency: formData.frequency,
                startPeriod: formData.startPeriod, // CORRIGIDO: Usa 'startPeriod'
                active: activeEdit, // CORRIGIDO: Usa 'active' e estado correto
                clientId: clientSelectionMode === 'all' ? null : (selectedClients[0]?.id ?? null)
            };
            console.log("Payload (Placeholder) para /update:", JSON.stringify(updatePayload));
            return updatePayload;
        }
    }, [editingConfigId, formData, activeEdit, clientSelectionMode, selectedClients, allClients]);

    // Hook useApi APENAS para UPDATE
    const { data: updateResponse, loading: updateLoading, error: updateError } = useApi<ApiResponseData>(
        submitEndpoint, // Passa endpoint relativo (hook deve concatenar com base dele)
        { method: submitMethod, body: getSubmitBody(), enabled: submitTrigger > 0 && !!editingConfigId }
    );

    // Hook useApi para ações da tabela
    const { loading: actionLoading, error: actionError, data: actionResponse } = useApi<ApiResponseData>(
        actionDetails?.url || '', // URL relativa (hook deve concatenar)
        { method: actionDetails?.method || 'PUT', body: actionDetails?.body, enabled: actionTrigger > 0 && !!actionDetails, }
    );

    // --- Efeitos ---
    useEffect(() => { if (!clientsLoading && !taxTypesLoading && !configsLoading) { const now = new Date(); const dateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }; const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }; setLastUpdated(`${now.toLocaleDateString('pt-PT', dateOptions)} ${now.toLocaleTimeString('pt-PT', timeOptions)}`); setIsRefreshingData(false); } }, [clientsLoading, taxTypesLoading, configsLoading]);
    const resetFormAndState = useCallback(() => { setFormData(initialFormData); setActiveEdit(true); setSelectedClients([]); setClientSelectionMode('individual'); setEditingConfigId(null); setClientSearchTerm(''); setShowClientDropdown(false); setSubmitTrigger(0); setActionDetails(null); setActionTrigger(0); setNotificationMessage(null); setCreateLoading(false); }, [initialFormData]); // CORRIGIDO: setActiveEdit
    useEffect(() => { if (editingConfigId && submitTrigger > 0) { if (!updateLoading) { if (updateError) { setNotificationMessage({ type: 'error', text: `Erro ao atualizar: ${updateError}` }); } else { setNotificationMessage({ type: 'success', text: `Configuração atualizada!` }); resetFormAndState(); setRefreshTrigger(prev => prev + 1); } setSubmitTrigger(0); } } }, [submitTrigger, updateLoading, updateError, editingConfigId, resetFormAndState]);
    useEffect(() => { if (actionTrigger > 0) { if(!actionLoading){ if (actionError) { setNotificationMessage({ type: 'error', text: `Erro na ação: ${actionError}` }); } else { setNotificationMessage({ type: 'success', text: actionResponse?.message || `Ação concluída!` }); setRefreshTrigger(prev => prev + 1); } setActionDetails(null); setActionTrigger(0); } } }, [actionTrigger, actionLoading, actionError, actionResponse, setRefreshTrigger]);
    useEffect(() => { let timerId: NodeJS.Timeout | null = null; if (notificationMessage) { timerId = setTimeout(() => setNotificationMessage(null), 5000); } return () => { if (timerId) clearTimeout(timerId); }; }, [notificationMessage]);
    useEffect(() => { setCurrentPage(1); }, [filterStatus]);

    // --- Handlers ---
    const handleStandardChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        // CORRIGIDO: Compara com 'startPeriod' (camelCase)
        const processedValue = name === 'startPeriod' ? (parseInt(value, 10) || 1) : value;
        setFormData(prev => ({ ...prev, [name]: processedValue }));
    }, []);
    const handleReactSelectChange = useCallback((fieldName: 'selectedNotificationTypeIds' | 'selectedTaxTypeIds') => { return (selectedOptions: MultiValue<SelectOption>) => { const selectedIds = selectedOptions ? selectedOptions.map(option => option.value) : []; setFormData(prev => ({ ...prev, [fieldName]: selectedIds })); }; }, []);
    const handleClientSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { const term = e.target.value; setClientSearchTerm(term); setShowClientDropdown(term.length > 0); }, []);
    const handleAddClient = useCallback((client: Client) => { if (!selectedClients.some(c => c.id === client.id)) { setSelectedClients(prev => [...prev, client]); } setClientSearchTerm(''); setShowClientDropdown(false); }, [selectedClients]);
    const handleRemoveClient = useCallback((clientId: number) => { setSelectedClients(prev => prev.filter(c => c.id !== clientId)); }, []);
    const handleClientModeChange = useCallback((mode: ClientSelectionMode) => { setClientSelectionMode(mode); if (mode === 'all') { setSelectedClients([]); setClientSearchTerm(''); setShowClientDropdown(false); } }, []);

    // Função Async para CRIAR (axios direto)
    const performCreateNotification = useCallback(async () => {
        setCreateLoading(true);
        setNotificationMessage(null);
        const payload = getSubmitBody();
        // !! NECESSÁRIO: Usar URL Base Completa !!
        const apiUrl = `${FULL_API_BASE_URL}/notification/create`; // Usa constante global
        console.log("Attempting POST to:", apiUrl);

        try {
            const response = await axios.post(apiUrl, payload, {
                headers: { 'Content-Type': 'application/json' },
            });
            console.log('Create response status (Axios):', response.status);
            setNotificationMessage({ type: 'success', text: `Configuração(ões) criada(s)!` });
            resetFormAndState();
            setRefreshTrigger(prev => prev + 1);
        } catch (err) {
            console.error("Erro ao criar notificação:", err);
            let errorMsg = "Erro ao criar notificação.";
            if (axios.isAxiosError(err)) { errorMsg = err.response?.data?.message || err.message || errorMsg; }
            else if (err instanceof Error) { errorMsg = err.message; }
            setNotificationMessage({ type: 'error', text: errorMsg });
        } finally {
            setCreateLoading(false);
        }
    }, [getSubmitBody, resetFormAndState]);

    // Handler de submissão principal
    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        // Validações
        if (!editingConfigId) { // Criação
             if (clientSelectionMode === 'individual' && selectedClients.length === 0) { setNotificationMessage({ type: 'error', text: 'Selecione cliente(s).' }); return; }
             if (clientSelectionMode === 'all' && allClients.length === 0) { setNotificationMessage({ type: 'error', text: 'Não há clientes para "Todos".' }); return; }
             if (formData.selectedNotificationTypeIds.length === 0) { setNotificationMessage({ type: 'error', text: 'Selecione tipo(s) de notificação.' }); return; }
             if (formData.selectedTaxTypeIds.length === 0) { setNotificationMessage({ type: 'error', text: 'Selecione imposto(s).' }); return; }
        } else { // Edição
             if (formData.selectedNotificationTypeIds.length === 0) { setNotificationMessage({ type: 'error', text: 'Selecione tipo(s) de notificação.' }); return; }
             if (formData.selectedTaxTypeIds.length === 0) { setNotificationMessage({ type: 'error', text: 'Selecione imposto(s).' }); return; }
        }
        if (!formData.frequency) { setNotificationMessage({ type: 'error', text: 'Selecione a Frequência.' }); return; }

        // Decide qual ação tomar
        if (!editingConfigId) {
            performCreateNotification(); // Chama axios direto
        } else {
             console.log("Disparando trigger para UPDATE via useApi...");
            setSubmitTrigger(prev => prev + 1); // Dispara useApi de update
        }
    }, [formData, selectedClients, clientSelectionMode, editingConfigId, allClients, performCreateNotification]);

    const handleRefresh = useCallback(() => { setIsRefreshingData(true); setRefreshTrigger((prev) => prev + 1); }, []);
    const handleEdit = useCallback((config: ApiNotificationConfig) => {
        console.warn("handleEdit: Verifique se `config` (do GET) tem IDs corretos.");
        setEditingConfigId(config.id);
        const initialNotifIds = config.notificationType ? [config.notificationType.id] : [];
        const initialTaxIds = config.taxType ? [config.taxType.id] : [];
        setFormData({
            selectedNotificationTypeIds: initialNotifIds,
            selectedTaxTypeIds: initialTaxIds,
            frequency: config.frequency,
            startPeriod: config.startPeriod, // CORRIGIDO: Usa camelCase
        });
        setActiveEdit(config.active); // CORRIGIDO: Usa 'active' e setter correto
        if (config.client) { setClientSelectionMode('individual'); setSelectedClients([{ id: config.client.id, name: config.client.name, nif: config.client.nif }]); }
        else { setClientSelectionMode('all'); setSelectedClients([]); }
        setClientSearchTerm(''); setShowClientDropdown(false); window.scrollTo(0, 0); setNotificationMessage(null);
    }, []); // Removido allClients como dependência
    const handleCancelEdit = useCallback(() => { resetFormAndState(); }, [resetFormAndState]);
    const handleTableAction = useCallback((action: 'delete' | 'toggle', originalConfigId: number, currentStatus?: boolean) => {
         console.warn("URLs e Payloads para Delete/Toggle precisam ser verificados!");
         let details: ActionDetails | null = null;
         // CORRIGIDO: Construir URLs relativas ao FULL_API_BASE_URL
         const deleteUrl = `<span class="math-inline">\{FULL\_API\_BASE\_URL\}/notification/delete/</span>{originalConfigId}`;
         const updateUrl = `<span class="math-inline">\{FULL\_API\_BASE\_URL\}/notification/update/</span>{originalConfigId}`;
         if (action === 'delete') {
             if (!window.confirm(`Apagar config ID ${originalConfigId}?`)) return;
             details = { url: deleteUrl, method: 'DELETE' }; // ** VERIFICAR URL **
         } else if (action === 'toggle') {
             details = {
                 url: updateUrl, // ** Assumindo PUT/update. VERIFICAR API **
                 method: 'PUT',
                 body: { active: !currentStatus } // ** CORRIGIDO: Usa 'active'. VERIFICAR PAYLOAD **
             };
         }
          if (details) { setActionDetails(details); setActionTrigger(prev => prev + 1); }
     }, []); // Adicionar FULL_API_BASE_URL como dependência se não for constante global pura
    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => { setFilterStatus(e.target.value as 'all' | 'active' | 'inactive'); };
    const handleNextPage = () => { setCurrentPage(prev => Math.min(prev + 1, totalPages)); };
    const handlePrevPage = () => { setCurrentPage(prev => Math.max(prev - 1, 1)); };
    const handleGoToPage = (pageNumber: number) => { setCurrentPage(Math.max(1, Math.min(pageNumber, totalPages))); };

    // --- Filtros e Mapeamentos para Renderização ---
    const filteredClients = useMemo(() => { if (!clientSearchTerm || clientSelectionMode === 'all') return []; const selIds = new Set(selectedClients.map(c=>c.id)); return allClients.filter(c=>!selIds.has(c.id) && (c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || c.nif.toString().includes(clientSearchTerm))).slice(0,10); }, [clientSearchTerm, allClients, selectedClients, clientSelectionMode]);

    // Determina loading geral
    const isSubmitting = createLoading || updateLoading;

    // --- Renderização ---
    if (clientsLoading || taxTypesLoading || configsLoading) { return <div id="notif-loading-initial"><FontAwesomeIcon icon={faSpinner} spin size="2x" /> Carregando...</div>; }
    if ((clientsError || taxTypesError || configsError) && originalConfigs.length === 0) { const err = clientsError || taxTypesError || configsError; return <div id="notif-msg-standalone-error" className="notification-message error"><FontAwesomeIcon icon={faExclamationTriangle}/> Erro: {err}</div>; }

    return (
        <Fragment>
            {/* Header */}
            <div id="notif-header"> <h1>{editingConfigId ? 'Editar Notificação' : 'Configurar Novas Notificações'}</h1> <div id="notif-last-updated" onClick={handleRefresh} title="Clique para atualizar" role="button" tabIndex={0}> <FontAwesomeIcon icon={faSyncAlt} spin={isRefreshingData} /> <span>{isRefreshingData ? ' Atualizando...' : (lastUpdated ? ` Última atualização: ${lastUpdated}` : ' Atualizar dados')}</span> </div> </div>

            {/* Mensagens */}
            {notificationMessage && ( <div id="notif-message-container" className={`notification-message ${notificationMessage.type}`} role="alert"> <FontAwesomeIcon icon={notificationMessage.type === 'success' ? faCheckCircle : faTimesCircle} /> <span className="message-text">{notificationMessage.text}</span> <button onClick={() => setNotificationMessage(null)} className="close-message" aria-label="Fechar">&times;</button> </div> )}

            {/* Layout */}
            <div id="notifications-layout">

                {/* Coluna Esquerda: Formulário */}
                <div id="notif-form-column" className="layout-column">
                    <div id="notif-form-card" className="notification-card">
                        <form onSubmit={handleSubmit} noValidate>
                             <fieldset className="fieldset-bordered"> <legend><FontAwesomeIcon icon={faUsers} /> Destinatário(s)</legend> <div id="notif-client-group"> {/* ... (Seleção Modo/Cliente) ... */} <div id="notif-client-mode-selector" className="segmented-control"> <button type="button" className={clientSelectionMode === 'individual' ? 'active' : ''} onClick={() => handleClientModeChange('individual')} disabled={!!editingConfigId && clientSelectionMode !== 'individual'} title={editingConfigId?"Bloqueado":"Individual"}> <FontAwesomeIcon icon={faUser} /> Individualmente </button> <button type="button" className={clientSelectionMode === 'all' ? 'active' : ''} onClick={() => handleClientModeChange('all')} disabled={!!editingConfigId && clientSelectionMode !== 'all'} title={editingConfigId?"Bloqueado":"Todos"}> <FontAwesomeIcon icon={faGlobe} /> Todos </button> </div> {clientSelectionMode === 'individual' && ( <Fragment> <div className="autocomplete-wrapper"> <FontAwesomeIcon icon={faSearch} className="search-icon" /> <label htmlFor="notif-client-search-input" className="sr-only">Pesquisar Cliente</label> <input type="text" id="notif-client-search-input" placeholder="Pesquisar e adicionar cliente..." value={clientSearchTerm} onChange={handleClientSearchChange} onFocus={() => clientSearchTerm.length > 0 && setShowClientDropdown(true)} autoComplete="off" disabled={!!editingConfigId} /> {showClientDropdown && filteredClients.length > 0 && ( <ul className="autocomplete-dropdown"> {filteredClients.map((client) => (<li key={client.id} onClick={() => handleAddClient(client)}>{client.name} ({client.nif})</li>))} </ul> )} </div> {clientSearchTerm.length > 0 && filteredClients.length === 0 && !clientsLoading && (<small className="no-results">Nenhum cliente.</small>)} <div id="notif-selected-clients-list"> {selectedClients.map(client => (<span key={client.id} className="selected-item-pill"> {client.name} {!editingConfigId && (<button type="button" onClick={() => handleRemoveClient(client.id)} className="remove-item-button">&times;</button>)} </span>))} {selectedClients.length === 0 && !editingConfigId && (<small className="no-selection">Nenhum.</small>)} {editingConfigId && selectedClients.length === 1 && (<div className="info-edit">Editando: <strong>{selectedClients[0].name}</strong></div>)} {editingConfigId && selectedClients.length === 0 && (<div className="info-edit error">Cliente original?</div>)} </div> </Fragment> )} {clientSelectionMode === 'all' && ( <div className="info-all-selected"> <FontAwesomeIcon icon={faCheckCircle} /> Aplicar a<strong>todos ({allClients.length})</strong>. {editingConfigId && (<div className="info-edit">Editando config global.</div>)} </div> )} </div> </fieldset>
                             <fieldset className="fieldset-bordered"> <legend><FontAwesomeIcon icon={faBell} /> Configuração</legend> {/* React Select Tipo */} <div className="form-group"> <label id="l1" htmlFor="notif-type-select-react">Tipo(s) <span className="required-indicator">*</span></label> <Select<SelectOption, true> inputId='notif-type-select-react' isMulti name="selectedNotificationTypeIds" options={notificationTypeOptions} className="basic-multi-select" classNamePrefix="select" placeholder="Selecione..." aria-labelledby="l1" onChange={handleReactSelectChange('selectedNotificationTypeIds')} value={notificationTypeOptions.filter(o=>formData.selectedNotificationTypeIds.includes(o.value))} isClearable closeMenuOnSelect={false} /> </div> {/* React Select Imposto */} <div className="form-group"> <label id="l2" htmlFor="tax-type-select-react">Imposto(s) <span className="required-indicator">*</span></label> <Select<SelectOption, true> inputId='tax-type-select-react' isMulti name="selectedTaxTypeIds" options={taxTypeOptions} className="basic-multi-select" classNamePrefix="select" placeholder="Selecione..." aria-labelledby="l2" onChange={handleReactSelectChange('selectedTaxTypeIds')} value={taxTypeOptions.filter(o=>formData.selectedTaxTypeIds.includes(o.value))} isClearable closeMenuOnSelect={false} /> </div> </fieldset>
                             <fieldset className="fieldset-bordered"> <legend><FontAwesomeIcon icon={faClock} /> Periodicidade</legend> <div className="form-row"> <div className="form-group"> <label htmlFor="notif_frequency_select">Frequência <span className="required-indicator">*</span></label> <select id="notif_frequency_select" name="frequency" value={formData.frequency} onChange={handleStandardChange} required> {frequencies.map((freq) => (<option key={freq} value={freq}>{freq}</option>))} </select> </div> <div className="form-group"> <label htmlFor="notif_start_period_input"> Antecedência ({frequencyUnits[formData.frequency] || 'dias'}) <span className="required-indicator">*</span> </label> <input id="notif_start_period_input" type="number" name="startPeriod" value={formData.startPeriod} min="1" onChange={handleStandardChange} required /> <small className="input-description"> Nº de {frequencyUnits[formData.frequency] || 'dias'} antes. </small> </div> </div> </fieldset>
                             {/* Botões */}
                             <div id="notif-form-actions"> <button id="notif-submit-button" type="submit" className="button-primary" disabled={isSubmitting || actionLoading || (clientSelectionMode === 'individual' && selectedClients.length === 0 && !editingConfigId)}> <FontAwesomeIcon icon={isSubmitting ? faSpinner : faSave} spin={isSubmitting} /> {isSubmitting ? 'A guardar...' : (editingConfigId ? 'Atualizar' : 'Guardar')} </button> {editingConfigId && ( <button id="notif-cancel-edit-button" type="button" className="button-secondary" onClick={handleCancelEdit} disabled={isSubmitting || actionLoading}> Cancelar </button> )} </div>
                        </form>
                    </div>
                </div>

                {/* Coluna Direita: Tabela */}
                 <div id="notif-table-column" className="layout-column">
                     {/* ... (Card da Tabela, Controles, Loading/Error, Tabela, Paginação) ... */}
                      <div id="notif-list-card">
                         <div id="notif-table-controls"> <h2><FontAwesomeIcon icon={faList}/> Existentes ({filteredGroupedConfigs.length})</h2> <div id="notif-filter-group"> <label htmlFor="notif-filterStatus-select"><FontAwesomeIcon icon={faFilter} /> Filtrar:</label> <select id="notif-filterStatus-select" value={filterStatus} onChange={handleFilterChange}> <option value="all">Todos</option> <option value="active">Ativos</option> <option value="inactive">Inativos</option> </select> </div> </div>
                         {configsLoading && !isRefreshingData && ( <div id="notif-loading-placeholder"><FontAwesomeIcon icon={faSpinner} spin /> Carregando...</div> )}
                         {configsError && !configsLoading && ( <div id="notif-error-placeholder"> <span><FontAwesomeIcon icon={faExclamationTriangle}/> Erro: {configsError}</span> <button id="notif-retry-button" onClick={handleRefresh} disabled={isRefreshingData}> <FontAwesomeIcon icon={faRedo} spin={isRefreshingData} /> Tentar Novamente </button> </div> )}
                         {!configsLoading && !configsError && (
                             <Fragment>
                                 <div id="notif-table-responsive">
                                     <table id="notifications-table-element" className="notifications-table">
                                          <thead> <tr> <th>Cliente(s)</th> <th>Tipo Notif.</th> <th>Imposto</th> <th>Frequência</th> <th>Antecedência</th> <th>Estado</th> <th>Ações</th> </tr> </thead>
                                         <tbody>
                                             {paginatedConfigs.length === 0 && ( <tr><td colSpan={7} className="no-data">Nenhuma config {filterStatus !== 'all' ? ` '${filterStatus}'` : ''}.</td></tr> )}
                                             {paginatedConfigs.map((group) => {
                                                 const isGrouped = group.clients.length > 1 || group.originalIds.length > 1;
                                                 let clientDisplay = ''; if (group.clients.length === 1 && group.clients[0]) { clientDisplay = `<span class="math-inline">\{group\.clients\[0\]\.name\} \(</span>{group.clients[0].nif})`; } else if (group.clients.length > 1) { clientDisplay = `${group.clients.length} Clientes`; } else { clientDisplay = 'Todos (?)'; }
                                                 const typeDisplay = group.notificationType.description || `ID:${group.notificationType.id}`;
                                                 const taxDisplay = group.taxType.description || `ID:${group.taxType.id}`;
                                                 const singleOriginalId = !isGrouped ? group.originalIds[0] : undefined;
                                                 const antecendenciaUnit = frequencyUnits[group.frequency] || 'dias';
                                                 return ( <tr key={group.key} className={group.active ? '' : 'inactive-row'}>
                                                     <td data-label="Cliente(s)">{clientDisplay}</td> <td data-label="Tipo">{typeDisplay}</td> <td data-label="Imposto">{taxDisplay}</td>
                                                     <td data-label="Freq.">{group.frequency}</td> <td data-label="Antec." className="cell-center">{group.startPeriod} {antecendenciaUnit.substring(0, group.frequency === 'Diário' ? 1 : group.frequency === 'Semanal' ? 3 : 1)}</td>
                                                     <td data-label="Estado" className="cell-center"><span className={`status ${group.active ? 'active' : 'inactive'}`}>{group.active ? 'Ativo' : 'Inativo'}</span></td>
                                                     <td data-label="Ações" className="action-buttons">
                                                          <button onClick={() => singleOriginalId && handleEdit(originalConfigs.find(c=>c.id===singleOriginalId)!)} title={isGrouped ? "Edição desabilitada" : "Editar"} disabled={isGrouped || actionLoading || isSubmitting} className="action-button edit"><FontAwesomeIcon icon={faEdit} /></button>
                                                         <button onClick={() => singleOriginalId && handleTableAction('toggle', singleOriginalId, group.active)} title={isGrouped ? "Ação desabilitada" : (group.active ? 'Desativar' : 'Ativar')} disabled={isGrouped || actionLoading || isSubmitting} className={`action-button toggle ${group.active ? 'toggle-off' : 'toggle-on'}`}><FontAwesomeIcon icon={group.active ? faToggleOff : faToggleOn} /></button>
                                                         <button onClick={() => singleOriginalId && handleTableAction('delete', singleOriginalId)} title={isGrouped ? "Ação desabilitada" : "Apagar"} disabled={isGrouped || actionLoading || isSubmitting} className="action-button delete"><FontAwesomeIcon icon={faTrashAlt} /></button>
                                                     </td> </tr> );
                                             })}
                                         </tbody>
                                     </table>
                                 </div>
                                 {totalPages > 1 && ( <div className="pagination-controls"> <span>Pág {currentPage} de {totalPages}</span> <div className="pagination-buttons"> <button onClick={handlePrevPage} disabled={currentPage === 1} aria-label="Anterior"> <FontAwesomeIcon icon={faChevronLeft} /> Ant </button> <button onClick={handleNextPage} disabled={currentPage === totalPages} aria-label="Próxima"> Próx <FontAwesomeIcon icon={faChevronRight} /> </button> </div> <span>{filteredGroupedConfigs.length} Grupos</span> </div> )}
                             </Fragment>
                         )}
                         {(actionLoading) && ( <div id="notif-action-loading"> <FontAwesomeIcon icon={faSpinner} spin /> Processando... </div> )}
                     </div>
                 </div>

            </div> {/* Fim layout */}
        </Fragment>
    );
};

export default Notifications;